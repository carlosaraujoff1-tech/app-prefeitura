-- SAP Cidadão — quem pode ver e mudar o quê (RLS em TODAS as tabelas).
-- Conteúdo público (banners, avisos, serviços, locais, agenda) é legível sem login.
-- Dados pessoais e solicitações: só o dono, a secretaria responsável e o administrador.

-- Funções de apoio (security definer: leem perfis sem cair na própria RLS) -----

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis
                  where id = (select auth.uid()) and tipo = 'admin' and ativo);
$$;

create or replace function public.eh_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis
                  where id = (select auth.uid()) and tipo in ('servidor', 'admin') and ativo);
$$;

create or replace function public.minha_secretaria()
returns uuid language sql stable security definer set search_path = public as $$
  select secretaria_id from public.perfis
   where id = (select auth.uid()) and tipo = 'servidor' and ativo;
$$;

-- Servidor da secretaria responsável ou administrador.
create or replace function public.pode_atender_solicitacao(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.eh_admin()
      or exists (select 1 from public.solicitacoes s
                  where s.id = p_id and s.secretaria_id = public.minha_secretaria());
$$;

-- Dono da solicitação, secretaria responsável ou administrador.
create or replace function public.pode_ver_solicitacao(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.solicitacoes s
                  where s.id = p_id and s.cidadao_id = (select auth.uid()))
      or public.pode_atender_solicitacao(p_id);
$$;

-- Novo usuário: cria o perfil a partir dos dados do cadastro ------------------

create or replace function public.tg_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_cpf text := public.so_digitos(m->>'cpf');
begin
  if not public.cpf_valido(v_cpf) then
    raise exception 'CPF inválido' using errcode = '22023';
  end if;
  if length(trim(coalesce(m->>'nome', ''))) < 3 then
    raise exception 'Nome obrigatório' using errcode = '22023';
  end if;
  insert into public.perfis (id, nome, cpf, email, telefone, cep, logradouro, numero,
                             complemento, bairro, cidade, uf, termos_aceitos_em)
  values (
    new.id,
    trim(m->>'nome'),
    v_cpf,
    lower(new.email),
    public.so_digitos(m->>'telefone'),
    public.so_digitos(m->>'cep'),
    nullif(trim(m->>'logradouro'), ''),
    nullif(trim(m->>'numero'), ''),
    nullif(trim(m->>'complemento'), ''),
    nullif(trim(m->>'bairro'), ''),
    coalesce(nullif(trim(m->>'cidade'), ''), 'Santo Antônio da Platina'),
    coalesce(nullif(upper(trim(m->>'uf')), ''), 'PR'),
    case when (m->>'termos_aceitos')::boolean then now() end
  );
  return new;
end $$;
create trigger auth_novo_usuario after insert on auth.users
  for each row execute function public.tg_novo_usuario();

-- Mantém o e-mail do perfil igual ao do login.
create or replace function public.tg_usuario_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.perfis set email = lower(new.email) where id = new.id;
  return new;
end $$;
create trigger auth_usuario_email after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.tg_usuario_email();

-- O cidadão edita nome, telefone e endereço; não pode virar admin nem trocar CPF.
create or replace function public.tg_perfis_protege_campos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.eh_admin() or current_setting('app.interno', true) = '1' then
    return new;
  end if;
  if new.tipo is distinct from old.tipo
     or new.secretaria_id is distinct from old.secretaria_id
     or new.cpf is distinct from old.cpf
     or new.email is distinct from old.email
     or new.ativo is distinct from old.ativo
     or new.bubble_id is distinct from old.bubble_id
     or new.criado_em is distinct from old.criado_em then
    raise exception 'Sem permissão para alterar estes campos' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger perfis_protege_campos before update on public.perfis
  for each row execute function public.tg_perfis_protege_campos();

-- Liga a RLS em tudo ----------------------------------------------------------

alter table public.secretarias            enable row level security;
alter table public.perfis                 enable row level security;
alter table public.banners                enable row level security;
alter table public.avisos                 enable row level security;
alter table public.tipos_solicitacao      enable row level security;
alter table public.servicos               enable row level security;
alter table public.locais                 enable row level security;
alter table public.eventos                enable row level security;
alter table public.solicitacoes           enable row level security;
alter table public.solicitacao_historico  enable row level security;
alter table public.solicitacao_anexos     enable row level security;
alter table public.lembretes_evento       enable row level security;
alter table public.erros_app              enable row level security;

-- Perfis
create policy perfis_ler on public.perfis for select to authenticated
  using (id = (select auth.uid()) or (select public.eh_admin()));
create policy perfis_editar on public.perfis for update to authenticated
  using (id = (select auth.uid()) or (select public.eh_admin()))
  with check (id = (select auth.uid()) or (select public.eh_admin()));

-- Conteúdo público: todos leem o que está ativo; só o admin escreve.
create policy secretarias_ler on public.secretarias for select to anon, authenticated
  using (ativo or (select public.eh_equipe()));
create policy secretarias_admin on public.secretarias for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy banners_ler on public.banners for select to anon, authenticated
  using ((ativo and (inicio_em is null or inicio_em <= now()) and (fim_em is null or fim_em > now()))
         or (select public.eh_admin()));
create policy banners_admin on public.banners for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy avisos_ler on public.avisos for select to anon, authenticated
  using ((ativo and publicado_em <= now() and (expira_em is null or expira_em > now()))
         or (select public.eh_admin()));
create policy avisos_admin on public.avisos for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy tipos_solicitacao_ler on public.tipos_solicitacao for select to anon, authenticated
  using (ativo or (select public.eh_equipe()));
create policy tipos_solicitacao_admin on public.tipos_solicitacao for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy servicos_ler on public.servicos for select to anon, authenticated
  using (ativo or (select public.eh_admin()));
create policy servicos_admin on public.servicos for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy locais_ler on public.locais for select to anon, authenticated
  using (ativo or (select public.eh_admin()));
create policy locais_admin on public.locais for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

create policy eventos_ler on public.eventos for select to anon, authenticated
  using (ativo or (select public.eh_admin()));
create policy eventos_admin on public.eventos for all to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));

-- Solicitações: só leitura direta. Abrir, mudar status, cancelar e avaliar
-- acontecem por funções (20261109190200_solicitacoes.sql), que conferem as regras.
create policy solicitacoes_ler on public.solicitacoes for select to authenticated
  using (cidadao_id = (select auth.uid())
         or (select public.eh_admin())
         or secretaria_id = (select public.minha_secretaria()));

create policy historico_ler on public.solicitacao_historico for select to authenticated
  using ((not interno and (select public.pode_ver_solicitacao(solicitacao_id)))
         or (select public.pode_atender_solicitacao(solicitacao_id)));

create policy anexos_ler on public.solicitacao_anexos for select to authenticated
  using ((select public.pode_ver_solicitacao(solicitacao_id)));
create policy anexos_incluir on public.solicitacao_anexos for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and split_part(caminho, '/', 1) = solicitacao_id::text
    and (select public.pode_ver_solicitacao(solicitacao_id))
    and exists (select 1 from public.solicitacoes s
                 where s.id = solicitacao_id
                   and s.status not in ('concluida', 'indeferida', 'cancelada'))
  );
create policy anexos_apagar on public.solicitacao_anexos for delete to authenticated
  using ((autor_id = (select auth.uid())
          and exists (select 1 from public.solicitacoes s
                       where s.id = solicitacao_id and s.status = 'aberta'))
         or (select public.eh_admin()));

-- Máximo de 10 fotos por solicitação.
create or replace function public.tg_anexos_limite()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.solicitacao_anexos where solicitacao_id = new.solicitacao_id) >= 10 then
    raise exception 'Limite de 10 fotos por solicitação' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger anexos_limite before insert on public.solicitacao_anexos
  for each row execute function public.tg_anexos_limite();

-- Lembretes: cada um vê e apaga os seus (criar/alterar é pela função definir_lembrete).
create policy lembretes_ler on public.lembretes_evento for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy lembretes_apagar on public.lembretes_evento for delete to authenticated
  using (usuario_id = (select auth.uid()));

-- Erros do app: qualquer um registra; só o admin lê.
create policy erros_incluir on public.erros_app for insert to anon, authenticated
  with check (usuario_id is null or usuario_id = (select auth.uid()));
create policy erros_ler on public.erros_app for select to authenticated
  using ((select public.eh_admin()));
