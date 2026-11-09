-- SAP Cidadão — apoio ao painel web (servidores e administradores).

-- Nunca ficar sem administrador ativo -------------------------------------------
create or replace function public.tg_perfis_ultimo_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.tipo = 'admin' and old.ativo and (new.tipo <> 'admin' or not new.ativo)
     and (select count(*) from public.perfis where tipo = 'admin' and ativo and id <> old.id) = 0 then
    raise exception 'Este é o último administrador ativo. Promova outra pessoa antes.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger perfis_ultimo_admin before update of tipo, ativo on public.perfis
  for each row execute function public.tg_perfis_ultimo_admin();

-- Resumo da tela inicial do painel (respeita a RLS: servidor vê só a sua secretaria)
create or replace function public.painel_resumo()
returns jsonb language sql stable security invoker set search_path = public as $$
  with s as (select * from public.solicitacoes),
       hoje as (select (now() at time zone 'America/Sao_Paulo')::date d)
  select jsonb_build_object(
    'por_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from s group by status) x), '{}'::jsonb),
    'abertas', (select count(*) from s where status in ('aberta', 'em_analise', 'em_execucao')),
    'novas_hoje', (select count(*) from s, hoje where (s.criado_em at time zone 'America/Sao_Paulo')::date = hoje.d),
    'atrasadas', (select count(*) from s, hoje where s.prazo_em < hoje.d and s.status in ('aberta', 'em_analise', 'em_execucao')),
    'sem_resposta_48h', (select count(*) from s where s.status = 'aberta' and s.criado_em < now() - interval '48 hours'),
    'concluidas_30d', (select count(*) from s where s.status = 'concluida' and s.concluida_em > now() - interval '30 days'),
    'nota_media', (select round(avg(avaliacao_nota)::numeric, 1) from s where avaliacao_nota is not null),
    'avaliacoes', (select count(*) from s where avaliacao_nota is not null),
    'cidadaos', case when public.eh_admin() then (select count(*) from public.perfis where tipo = 'cidadao') end,
    'cidadaos_7d', case when public.eh_admin() then (select count(*) from public.perfis where tipo = 'cidadao' and criado_em > now() - interval '7 days') end,
    'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', d, 'n', n) order by d) from (
        select g::date d, (select count(*) from s where (s.criado_em at time zone 'America/Sao_Paulo')::date = g::date) n
          from generate_series((select d from hoje) - 29, (select d from hoje), interval '1 day') g) x), '[]'::jsonb)
  );
$$;

-- Histórico completo (com notas internas e o nome de quem escreveu) — só equipe.
create or replace function public.painel_historico(p_id uuid)
returns table (id bigint, status public.status_solicitacao, mensagem text, interno boolean,
               criado_em timestamptz, autor_nome text, autor_equipe boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_atender_solicitacao(p_id) then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;
  return query
    select h.id, h.status, h.mensagem, h.interno, h.criado_em,
           coalesce(p.nome, 'Sistema'), coalesce(p.tipo <> 'cidadao', false)
      from public.solicitacao_historico h
      left join public.perfis p on p.id = h.autor_id
     where h.solicitacao_id = p_id
     order by h.criado_em, h.id;
end $$;

-- Relatório por período (respeita a RLS de quem pede).
create or replace function public.painel_relatorio(p_inicio date, p_fim date)
returns jsonb language sql stable security invoker set search_path = public as $$
  with s as (
    select s.*, t.nome tipo_nome, sec.nome secretaria_nome
      from public.solicitacoes s
      join public.tipos_solicitacao t on t.id = s.tipo_id
      join public.secretarias sec on sec.id = s.secretaria_id
     where (s.criado_em at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim
  )
  select jsonb_build_object(
    'total', (select count(*) from s),
    'concluidas', (select count(*) from s where status = 'concluida'),
    'canceladas', (select count(*) from s where status = 'cancelada'),
    'nao_atendidas', (select count(*) from s where status = 'indeferida'),
    'em_aberto', (select count(*) from s where status in ('aberta', 'em_analise', 'em_execucao')),
    'horas_media_conclusao', (select round(avg(extract(epoch from (concluida_em - criado_em)) / 3600)::numeric, 1) from s where status = 'concluida'),
    'nota_media', (select round(avg(avaliacao_nota)::numeric, 1) from s where avaliacao_nota is not null),
    'por_tipo', coalesce((select jsonb_agg(x order by x.n desc) from (select tipo_nome nome, count(*) n,
        count(*) filter (where status = 'concluida') concluidas from s group by tipo_nome) x), '[]'::jsonb),
    'por_bairro', coalesce((select jsonb_agg(x order by x.n desc) from (select coalesce(nullif(bairro, ''), 'Não informado') nome, count(*) n,
        count(*) filter (where status = 'concluida') concluidas from s group by 1) x), '[]'::jsonb),
    'por_secretaria', coalesce((select jsonb_agg(x order by x.n desc) from (select secretaria_nome nome, count(*) n,
        count(*) filter (where status = 'concluida') concluidas,
        round(avg(extract(epoch from (concluida_em - criado_em)) / 3600) filter (where status = 'concluida')::numeric, 1) horas
        from s group by secretaria_nome) x), '[]'::jsonb),
    'notas', coalesce((select jsonb_object_agg(avaliacao_nota, n) from (select avaliacao_nota, count(*) n from s
        where avaliacao_nota is not null group by avaliacao_nota) x), '{}'::jsonb)
  );
$$;

revoke execute on function public.painel_resumo() from public, anon;
revoke execute on function public.painel_historico(uuid) from public, anon;
revoke execute on function public.painel_relatorio(date, date) from public, anon;
grant execute on function public.painel_resumo() to authenticated;
grant execute on function public.painel_historico(uuid) to authenticated;
grant execute on function public.painel_relatorio(date, date) to authenticated;

-- Fotos da equipe nas solicitações (ex.: "serviço feito"): a equipe também pode anexar.
-- (As políticas de anexos e de storage já usam pode_ver_solicitacao, que inclui a equipe.)
