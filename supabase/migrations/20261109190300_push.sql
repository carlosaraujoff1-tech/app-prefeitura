-- SAP Cidadão — notificações (lista no app + push no celular).
-- Mesmo padrão da loja: notificação → fila_push → Edge Function processar-fila-push → Expo Push.

create table public.notificacoes (
  id              uuid primary key default gen_random_uuid(),
  titulo          text not null,
  corpo           text not null,
  imagem_url      text,
  rota_destino    text,                    -- ex.: /solicitacoes/<id>
  destinatario_id uuid references public.perfis(id) on delete cascade,  -- null = todos
  evento          text,                    -- null = envio manual
  criado_por      uuid references public.perfis(id) on delete set null,
  criado_em       timestamptz not null default now()
);
create index notificacoes_dest_idx on public.notificacoes (destinatario_id, criado_em desc);
create index notificacoes_gerais_idx on public.notificacoes (criado_em desc) where destinatario_id is null;
create index notificacoes_criado_por_idx on public.notificacoes (criado_por);

create table public.dispositivos_push (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references public.perfis(id) on delete cascade,
  token         text not null unique,
  plataforma    text not null check (plataforma in ('ios', 'android')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index dispositivos_usuario_idx on public.dispositivos_push (usuario_id) where ativo;
create trigger dispositivos_atualizado_em before update on public.dispositivos_push
  for each row execute function public.tg_set_atualizado_em();

-- Modelos de texto das notificações automáticas (editáveis no painel).
create table public.eventos_push (
  chave         text primary key,
  descricao     text not null,
  ativo         boolean not null default true,
  titulo        text not null,
  corpo         text not null,
  rota          text,
  atualizado_em timestamptz not null default now()
);
create trigger eventos_push_atualizado_em before update on public.eventos_push
  for each row execute function public.tg_set_atualizado_em();

insert into public.eventos_push (chave, descricao, titulo, corpo, rota) values
  ('solicitacao_status', 'Mudança de status da solicitação (para o cidadão)',
   'Solicitação {protocolo}', '{tipo}: agora está "{status}". {mensagem}', '/solicitacoes/{id}'),
  ('solicitacao_mensagem', 'Mensagem da prefeitura na solicitação (para o cidadão)',
   'Solicitação {protocolo}', 'Nova mensagem da prefeitura: {mensagem}', '/solicitacoes/{id}'),
  ('solicitacao_nova', 'Nova solicitação (para a equipe da secretaria)',
   'Nova solicitação {protocolo}', '{tipo} — {bairro}', '/solicitacoes/{id}'),
  ('lembrete_evento', 'Lembrete de evento da agenda (para quem ativou o sino)',
   'Lembrete: {titulo}', 'Começa {quando}{local}.', '/agenda/{id}');

create table public.fila_push (
  id              bigint generated always as identity primary key,
  notificacao_id  uuid not null references public.notificacoes(id) on delete cascade,
  status          text not null default 'pendente' check (status in ('pendente', 'enviando', 'enviado', 'erro')),
  tentativas      integer not null default 0,
  erro            text,
  criado_em       timestamptz not null default now(),
  processado_em   timestamptz
);
create index fila_push_pendentes on public.fila_push (criado_em) where status in ('pendente', 'enviando');
create index fila_push_notificacao_idx on public.fila_push (notificacao_id);

alter table public.notificacoes      enable row level security;
alter table public.dispositivos_push enable row level security;
alter table public.eventos_push      enable row level security;
alter table public.fila_push         enable row level security;   -- sem política: só service_role

create policy notificacoes_ler on public.notificacoes for select to authenticated
  using (destinatario_id = (select auth.uid()) or destinatario_id is null or (select public.eh_admin()));
create policy notificacoes_admin on public.notificacoes for insert to authenticated
  with check ((select public.eh_admin()) and criado_por = (select auth.uid()));
create policy notificacoes_admin_apagar on public.notificacoes for delete to authenticated
  using ((select public.eh_admin()));

create policy dispositivos_proprio on public.dispositivos_push for select to authenticated
  using (usuario_id = (select auth.uid()) or (select public.eh_admin()));
create policy dispositivos_apagar on public.dispositivos_push for delete to authenticated
  using (usuario_id = (select auth.uid()));

create policy eventos_push_admin on public.eventos_push for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

-- Registro do celular (chamado no login) -------------------------------------
create or replace function public.registrar_dispositivo(p_token text, p_plataforma text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  insert into public.dispositivos_push (usuario_id, token, plataforma)
  values (auth.uid(), p_token, p_plataforma)
  on conflict (token) do update
    set usuario_id = excluded.usuario_id, plataforma = excluded.plataforma, ativo = true;
end $$;

create or replace function public.remover_dispositivo(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from public.dispositivos_push where token = p_token and usuario_id = auth.uid();
$$;

-- Não lidas ----------------------------------------------------------------------
create or replace function public.notificacoes_nao_lidas()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.notificacoes n, public.perfis p
   where p.id = auth.uid()
     and n.criado_em > p.notificacoes_lidas_em
     and (n.destinatario_id = p.id or n.destinatario_id is null);
$$;

create or replace function public.marcar_notificacoes_lidas()
returns void language sql security definer set search_path = public as $$
  update public.perfis set notificacoes_lidas_em = now() where id = auth.uid();
$$;

-- Motor de eventos -------------------------------------------------------------
create or replace function privado.aplicar_modelo(p_texto text, p_vars jsonb)
returns text language plpgsql immutable set search_path = public as $$
declare
  k text; v text; r text := p_texto;
begin
  if r is null then return null; end if;
  for k, v in select * from jsonb_each_text(p_vars) loop
    r := replace(r, '{' || k || '}', coalesce(v, ''));
  end loop;
  return trim(r);
end $$;

create or replace function privado.disparar_evento(p_chave text, p_destinatarios uuid[], p_vars jsonb)
returns void language plpgsql security definer set search_path = public, privado as $$
declare
  e public.eventos_push%rowtype;
begin
  select * into e from public.eventos_push where chave = p_chave and ativo;
  if not found or p_destinatarios is null then return; end if;
  insert into public.notificacoes (titulo, corpo, rota_destino, destinatario_id, evento)
  select privado.aplicar_modelo(e.titulo, p_vars),
         left(privado.aplicar_modelo(e.corpo, p_vars), 300),
         privado.aplicar_modelo(e.rota, p_vars),
         d, p_chave
    from unnest(p_destinatarios) d
   where d is not null;
end $$;

create or replace function privado.tg_notificacao_para_fila()
returns trigger language plpgsql security definer set search_path = public, privado as $$
begin
  insert into public.fila_push (notificacao_id) values (new.id);
  return new;
end $$;
create trigger notificacao_para_fila after insert on public.notificacoes
  for each row execute function privado.tg_notificacao_para_fila();

create or replace function privado.chamar_processar_push()
returns void language plpgsql security definer set search_path = public, privado, extensions as $$
declare
  v_url text := privado.cfg('edge_functions_url');
  v_seg text := privado.cfg('push_segredo');
begin
  if v_url is null or v_seg is null then return; end if;
  perform net.http_post(
    url     := v_url || '/processar-fila-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-segredo', v_seg),
    body    := '{}'::jsonb
  );
end $$;

create or replace function privado.tg_fila_acionar()
returns trigger language plpgsql security definer set search_path = public, privado as $$
begin
  perform privado.chamar_processar_push();
  return null;
end $$;
create trigger fila_acionar after insert on public.fila_push
  for each statement execute function privado.tg_fila_acionar();

-- Histórico da solicitação → avisa o cidadão (se quem escreveu foi a equipe).
create or replace function privado.tg_historico_avisa_cidadao()
returns trigger language plpgsql security definer set search_path = public, privado as $$
declare
  s public.solicitacoes%rowtype;
  v_tipo text;
begin
  if new.interno then return null; end if;
  select * into s from public.solicitacoes where id = new.solicitacao_id;
  if s.cidadao_id is null or s.cidadao_id = new.autor_id then return null; end if;
  select nome into v_tipo from public.tipos_solicitacao where id = s.tipo_id;
  perform privado.disparar_evento(
    case when new.status is not null then 'solicitacao_status' else 'solicitacao_mensagem' end,
    array[s.cidadao_id],
    jsonb_build_object('id', s.id, 'protocolo', s.protocolo, 'tipo', v_tipo,
                       'status', public.status_rotulo(coalesce(new.status, s.status)),
                       'mensagem', coalesce(new.mensagem, '')));
  return null;
end $$;
create trigger historico_avisa_cidadao after insert on public.solicitacao_historico
  for each row execute function privado.tg_historico_avisa_cidadao();

-- Nova solicitação → avisa servidores da secretaria e administradores.
create or replace function privado.tg_solicitacao_nova_avisa_equipe()
returns trigger language plpgsql security definer set search_path = public, privado as $$
declare
  v_tipo text;
begin
  select nome into v_tipo from public.tipos_solicitacao where id = new.tipo_id;
  perform privado.disparar_evento('solicitacao_nova',
    array(select id from public.perfis
           where ativo and (tipo = 'admin' or (tipo = 'servidor' and secretaria_id = new.secretaria_id))),
    jsonb_build_object('id', new.id, 'protocolo', new.protocolo, 'tipo', v_tipo,
                       'bairro', coalesce(new.bairro, new.endereco, 'local não informado')));
  return null;
end $$;
create trigger solicitacao_nova_avisa_equipe after insert on public.solicitacoes
  for each row execute function privado.tg_solicitacao_nova_avisa_equipe();

-- Lembretes vencidos → notificação (roda a cada minuto) -------------------------
create or replace function privado.processar_lembretes()
returns integer language plpgsql security definer set search_path = public, privado as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select l.id, l.usuario_id, e.id as evento_id, e.titulo, e.inicio_em,
           coalesce(e.local_nome, lo.nome) as local_nome
      from public.lembretes_evento l
      join public.eventos e on e.id = l.evento_id and e.ativo
      left join public.locais lo on lo.id = e.local_id
     where l.enviado_em is null and l.enviar_em <= now()
       and e.inicio_em > now() - interval '30 minutes'
     order by l.enviar_em
     limit 500
     for update of l skip locked
  loop
    perform privado.disparar_evento('lembrete_evento', array[r.usuario_id], jsonb_build_object(
      'id', r.evento_id, 'titulo', r.titulo,
      'quando', case
                  when (r.inicio_em at time zone 'America/Sao_Paulo')::date
                       = (now() at time zone 'America/Sao_Paulo')::date
                  then 'hoje às ' || to_char(r.inicio_em at time zone 'America/Sao_Paulo', 'HH24:MI')
                  else 'em ' || to_char(r.inicio_em at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI')
                end,
      'local', coalesce(' — ' || r.local_nome, '')));
    update public.lembretes_evento set enviado_em = now() where id = r.id;
    n := n + 1;
  end loop;
  -- Lembretes de eventos cancelados ou que já passaram: marca para não acumular.
  update public.lembretes_evento l set enviado_em = now()
   where l.enviado_em is null and l.enviar_em <= now()
     and not exists (select 1 from public.eventos e
                      where e.id = l.evento_id and e.ativo and e.inicio_em > now() - interval '30 minutes');
  return n;
end $$;

create or replace function privado.reprocessar_fila_push()
returns void language plpgsql security definer set search_path = public, privado as $$
begin
  if exists (select 1 from public.fila_push
              where status in ('pendente', 'enviando') and tentativas < 5
                and criado_em < now() - interval '1 minute') then
    perform privado.chamar_processar_push();
  end if;
end $$;

-- Funções usadas só pela Edge Function (service_role) ---------------------------
create or replace function public.reservar_fila_push(p_limite integer default 50)
returns table (id bigint, notificacao_id uuid)
language sql security definer set search_path = public as $$
  update public.fila_push f
     set status = 'enviando', tentativas = f.tentativas + 1
   where f.id in (
     select id from public.fila_push
      where (status = 'pendente' or (status = 'enviando' and criado_em < now() - interval '2 minutes'))
        and tentativas < 5
      order by id
      limit p_limite
      for update skip locked)
  returning f.id, f.notificacao_id;
$$;

create or replace function public.push_segredo_confere(p_segredo text)
returns boolean language sql stable security definer set search_path = public, privado as $$
  select p_segredo is not null and p_segredo = privado.cfg('push_segredo');
$$;

insert into privado.config (chave, valor) values
  ('edge_functions_url', 'https://jgmcmdkbmuhpfjbykgbg.supabase.co/functions/v1'),
  ('push_segredo', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (chave) do nothing;

select cron.schedule('lembretes-evento', '* * * * *', 'select privado.processar_lembretes()');
select cron.schedule('fila-push-reprocessar', '* * * * *', 'select privado.reprocessar_fila_push()');
-- Faxina: tentativas de login com mais de 7 dias.
select cron.schedule('limpar-tentativas-login', '17 3 * * *',
  $$delete from privado.tentativas_login where criado_em < now() - interval '7 days'$$);
