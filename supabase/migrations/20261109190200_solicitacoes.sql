-- SAP Cidadão — regras das solicitações, lembretes, tela inicial e exclusão de conta.
-- Todas as ações sensíveis passam por aqui (security definer), nunca pelo app direto.

create or replace function public.status_rotulo(s public.status_solicitacao)
returns text language sql immutable set search_path = public as $$
  select case s
    when 'aberta'      then 'Aberta'
    when 'em_analise'  then 'Em análise'
    when 'em_execucao' then 'Em execução'
    when 'concluida'   then 'Concluída'
    when 'indeferida'  then 'Não atendida'
    when 'cancelada'   then 'Cancelada'
  end;
$$;

-- Cidadão abre uma solicitação --------------------------------------------------
create or replace function public.abrir_solicitacao(
  p_tipo_id          uuid,
  p_descricao        text,
  p_endereco         text default null,
  p_bairro           text default null,
  p_ponto_referencia text default null,
  p_latitude         double precision default null,
  p_longitude        double precision default null
) returns public.solicitacoes
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_pf   public.perfis%rowtype;
  v_tipo public.tipos_solicitacao%rowtype;
  v_sol  public.solicitacoes%rowtype;
  v_ano  text := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY');
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para abrir uma solicitação' using errcode = '42501';
  end if;
  select * into v_pf from public.perfis where id = v_uid and ativo;
  if not found then
    raise exception 'Conta desativada' using errcode = '42501';
  end if;
  select * into v_tipo from public.tipos_solicitacao where id = p_tipo_id and ativo;
  if not found then
    raise exception 'Tipo de solicitação indisponível' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_descricao, ''))) < 10 then
    raise exception 'Descreva o problema com pelo menos 10 letras' using errcode = 'P0001';
  end if;
  if v_tipo.exige_localizacao and nullif(trim(coalesce(p_endereco, '')), '') is null
     and (p_latitude is null or p_longitude is null) then
    raise exception 'Informe o endereço ou marque o local no mapa' using errcode = 'P0001';
  end if;
  if (select count(*) from public.solicitacoes
       where cidadao_id = v_uid and criado_em > now() - interval '24 hours') >= 10 then
    raise exception 'Limite de 10 solicitações por dia atingido. Tente novamente amanhã.' using errcode = 'P0001';
  end if;

  insert into public.solicitacoes (protocolo, cidadao_id, cidadao_nome, cidadao_telefone, tipo_id,
                                   secretaria_id, descricao, endereco, bairro, ponto_referencia,
                                   latitude, longitude, prazo_em)
  values (v_ano || '.' || lpad(nextval('public.solicitacoes_protocolo_seq')::text, 6, '0'),
          v_uid, v_pf.nome, v_pf.telefone, v_tipo.id, v_tipo.secretaria_id,
          trim(p_descricao), nullif(trim(p_endereco), ''), nullif(trim(p_bairro), ''),
          nullif(trim(p_ponto_referencia), ''), p_latitude, p_longitude,
          case when v_tipo.prazo_dias is not null
               then (now() at time zone 'America/Sao_Paulo')::date + v_tipo.prazo_dias end)
  returning * into v_sol;

  insert into public.solicitacao_historico (solicitacao_id, status, mensagem, autor_id)
  values (v_sol.id, 'aberta', 'Solicitação registrada.', v_uid);

  return v_sol;
end $$;

-- Servidor/admin muda status e/ou escreve mensagem ------------------------------
-- p_status null = só mensagem. p_interno = nota visível só para a equipe.
create or replace function public.atualizar_solicitacao(
  p_id       uuid,
  p_status   public.status_solicitacao default null,
  p_mensagem text default null,
  p_interno  boolean default false
) returns public.solicitacoes
language plpgsql security definer set search_path = public as $$
declare
  v_sol public.solicitacoes%rowtype;
  v_msg text := nullif(trim(coalesce(p_mensagem, '')), '');
begin
  if not public.pode_atender_solicitacao(p_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  select * into v_sol from public.solicitacoes where id = p_id for update;
  if p_status is null and v_msg is null then
    raise exception 'Nada para atualizar' using errcode = 'P0001';
  end if;
  if p_status is not null then
    if p_status in ('aberta', 'cancelada') then
      raise exception 'Status não permitido para a equipe' using errcode = 'P0001';
    end if;
    if v_sol.status = 'cancelada' then
      raise exception 'Solicitação cancelada pelo cidadão' using errcode = 'P0001';
    end if;
    if v_sol.status in ('concluida', 'indeferida') and not public.eh_admin() then
      raise exception 'Só o administrador reabre solicitações finalizadas' using errcode = '42501';
    end if;
    if p_status = 'indeferida' and v_msg is null then
      raise exception 'Explique ao cidadão por que não será atendida' using errcode = 'P0001';
    end if;
    if p_interno then
      raise exception 'Mudança de status é sempre visível ao cidadão' using errcode = 'P0001';
    end if;
  end if;

  if p_status is not null and p_status is distinct from v_sol.status then
    update public.solicitacoes
       set status = p_status,
           concluida_em = case when p_status in ('concluida', 'indeferida') then now() end
     where id = p_id
    returning * into v_sol;
  end if;

  insert into public.solicitacao_historico (solicitacao_id, status, mensagem, interno, autor_id)
  values (p_id, p_status, v_msg, coalesce(p_interno, false), auth.uid());

  return v_sol;
end $$;

-- Encaminhar para outra secretaria ----------------------------------------------
create or replace function public.transferir_solicitacao(p_id uuid, p_secretaria_id uuid, p_mensagem text default null)
returns public.solicitacoes
language plpgsql security definer set search_path = public as $$
declare
  v_sol public.solicitacoes%rowtype;
  v_nome text;
begin
  if not public.pode_atender_solicitacao(p_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  select nome into v_nome from public.secretarias where id = p_secretaria_id and ativo;
  if v_nome is null then
    raise exception 'Secretaria inválida' using errcode = 'P0001';
  end if;
  update public.solicitacoes set secretaria_id = p_secretaria_id
   where id = p_id and status not in ('concluida', 'indeferida', 'cancelada')
  returning * into v_sol;
  if not found then
    raise exception 'Solicitação finalizada não pode ser encaminhada' using errcode = 'P0001';
  end if;
  insert into public.solicitacao_historico (solicitacao_id, mensagem, interno, autor_id)
  values (p_id, 'Encaminhada para ' || v_nome || coalesce('. ' || nullif(trim(p_mensagem), ''), ''),
          true, auth.uid());
  return v_sol;
end $$;

-- Cidadão cancela (só antes de a equipe começar a executar) ---------------------
create or replace function public.cancelar_solicitacao(p_id uuid, p_motivo text default null)
returns public.solicitacoes
language plpgsql security definer set search_path = public as $$
declare
  v_sol public.solicitacoes%rowtype;
begin
  update public.solicitacoes set status = 'cancelada'
   where id = p_id and cidadao_id = auth.uid() and status in ('aberta', 'em_analise')
  returning * into v_sol;
  if not found then
    raise exception 'Esta solicitação não pode mais ser cancelada' using errcode = 'P0001';
  end if;
  insert into public.solicitacao_historico (solicitacao_id, status, mensagem, autor_id)
  values (p_id, 'cancelada', coalesce(nullif(trim(p_motivo), ''), 'Cancelada pelo cidadão.'), auth.uid());
  return v_sol;
end $$;

-- Cidadão avalia o atendimento (nota de 1 a 5) ---------------------------------
create or replace function public.avaliar_solicitacao(p_id uuid, p_nota integer, p_comentario text default null)
returns public.solicitacoes
language plpgsql security definer set search_path = public as $$
declare
  v_sol public.solicitacoes%rowtype;
begin
  if p_nota is null or p_nota not between 1 and 5 then
    raise exception 'Nota de 1 a 5' using errcode = 'P0001';
  end if;
  update public.solicitacoes
     set avaliacao_nota = p_nota,
         avaliacao_comentario = nullif(trim(left(coalesce(p_comentario, ''), 500)), ''),
         avaliada_em = now()
   where id = p_id and cidadao_id = auth.uid() and status in ('concluida', 'indeferida')
  returning * into v_sol;
  if not found then
    raise exception 'Só é possível avaliar solicitações finalizadas' using errcode = 'P0001';
  end if;
  return v_sol;
end $$;

-- Lembrete de evento: "me avise X minutos antes" -------------------------------
create or replace function public.definir_lembrete(p_evento_id uuid, p_antecedencia_minutos integer)
returns public.lembretes_evento
language plpgsql security definer set search_path = public as $$
declare
  v_inicio timestamptz;
  v_enviar timestamptz;
  v_l public.lembretes_evento%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para receber lembretes' using errcode = '42501';
  end if;
  if p_antecedencia_minutos is null or p_antecedencia_minutos not between 5 and 10080 then
    raise exception 'Antecedência inválida' using errcode = 'P0001';
  end if;
  select inicio_em into v_inicio from public.eventos where id = p_evento_id and ativo;
  if v_inicio is null then
    raise exception 'Evento indisponível' using errcode = 'P0001';
  end if;
  v_enviar := v_inicio - make_interval(mins => p_antecedencia_minutos);
  if v_enviar <= now() then
    raise exception 'Esse horário de aviso já passou. Escolha um tempo menor.' using errcode = 'P0001';
  end if;
  insert into public.lembretes_evento (usuario_id, evento_id, antecedencia_minutos, enviar_em)
  values (auth.uid(), p_evento_id, p_antecedencia_minutos, v_enviar)
  on conflict (usuario_id, evento_id) do update
    set antecedencia_minutos = excluded.antecedencia_minutos,
        enviar_em = excluded.enviar_em,
        enviado_em = null
  returning * into v_l;
  return v_l;
end $$;

-- Se a prefeitura muda o horário do evento, os lembretes acompanham.
create or replace function public.tg_evento_recalcula_lembretes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.lembretes_evento
     set enviar_em = new.inicio_em - make_interval(mins => antecedencia_minutos)
   where evento_id = new.id and enviado_em is null;
  return null;
end $$;
create trigger evento_recalcula_lembretes after update of inicio_em on public.eventos
  for each row when (old.inicio_em is distinct from new.inicio_em)
  execute function public.tg_evento_recalcula_lembretes();

-- Tela inicial em UMA chamada (rapidez) --------------------------------------
-- security invoker: respeita a RLS de quem chama.
create or replace function public.inicio()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'banners', coalesce((select jsonb_agg(b order by b.ordem, b.criado_em desc) from (
        select id, titulo, imagem_url, link, ordem, criado_em from public.banners
         where ativo and (inicio_em is null or inicio_em <= now()) and (fim_em is null or fim_em > now())
         order by ordem, criado_em desc limit 8) b), '[]'::jsonb),
    'avisos', coalesce((select jsonb_agg(a order by a.fixado desc, a.publicado_em desc) from (
        select id, titulo, resumo, imagem_url, link, fixado, publicado_em from public.avisos
         where ativo and publicado_em <= now() and (expira_em is null or expira_em > now())
         order by fixado desc, publicado_em desc limit 10) a), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(e order by e.inicio_em) from (
        select id, titulo, categoria, imagem_url, local_nome, inicio_em, fim_em from public.eventos
         where ativo and coalesce(fim_em, inicio_em + interval '2 hours') >= now()
         order by inicio_em limit 5) e), '[]'::jsonb),
    'servicos_destaque', coalesce((select jsonb_agg(s order by s.ordem, s.nome) from (
        select id, nome, imagem_url, icone, link_externo, tipo_solicitacao_id, ordem from public.servicos
         where ativo and destaque order by ordem, nome limit 8) s), '[]'::jsonb)
  );
$$;

-- Último acesso (para estatística simples) -------------------------------------
create or replace function public.registrar_acesso()
returns void language sql security definer set search_path = public as $$
  update public.perfis set ultimo_acesso = now()
   where id = auth.uid() and (ultimo_acesso is null or ultimo_acesso < now() - interval '1 hour');
$$;

-- Exclusão de conta (LGPD) ------------------------------------------------------
-- Apaga a conta e os dados pessoais. As solicitações ficam como registro público
-- da prefeitura, sem nome nem telefone do cidadão.
create or replace function public.excluir_minha_conta()
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  if public.eh_equipe() then
    raise exception 'Contas de servidor são removidas pelo administrador' using errcode = '42501';
  end if;
  update public.solicitacoes
     set cidadao_nome = 'Conta excluída', cidadao_telefone = null
   where cidadao_id = v_uid;
  delete from auth.users where id = v_uid;
end $$;
