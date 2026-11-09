-- SAP Cidadão — estruturas que existiam no Bubble: bairros, categorias de evento, notícias.
-- Também: banners sem foto (cartão colorido com ícone) e mais categorias de locais.

-- Bairros (lista para o cidadão escolher) -------------------------------------
create table public.bairros (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique,
  ordem     integer not null default 0,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.bairros enable row level security;
create policy bairros_ler on public.bairros for select to anon, authenticated
  using (ativo or (select public.eh_admin()));
create policy bairros_admin_incluir on public.bairros for insert to authenticated with check ((select public.eh_admin()));
create policy bairros_admin_alterar on public.bairros for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy bairros_admin_apagar on public.bairros for delete to authenticated using ((select public.eh_admin()));

-- Categorias de evento (cor e ícone na agenda) ---------------------------------
create table public.categorias_evento (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  descricao  text,
  cor        text not null default '#0B4A8F' check (cor ~ '^#[0-9A-Fa-f]{6}$'),
  icone      text not null default 'calendar',
  ordem      integer not null default 0,
  ativo      boolean not null default true,
  bubble_id  text unique,
  criado_em  timestamptz not null default now()
);
alter table public.categorias_evento enable row level security;
create policy categorias_evento_ler on public.categorias_evento for select to anon, authenticated
  using (ativo or (select public.eh_admin()));
create policy categorias_evento_admin_incluir on public.categorias_evento for insert to authenticated with check ((select public.eh_admin()));
create policy categorias_evento_admin_alterar on public.categorias_evento for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy categorias_evento_admin_apagar on public.categorias_evento for delete to authenticated using ((select public.eh_admin()));

alter table public.eventos drop column categoria;
alter table public.eventos add column categoria_id uuid references public.categorias_evento(id) on delete set null;
create index eventos_categoria_idx on public.eventos (categoria_id);

-- Notícias -----------------------------------------------------------------------
create table public.noticias (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  resumo        text,
  conteudo      text not null,
  imagem_url    text,                   -- 16:9, WebP
  publicado_em  timestamptz not null default now(),
  ativo         boolean not null default true,
  criado_por    uuid references public.perfis(id) on delete set null,
  bubble_id     text unique,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index noticias_publicadas_idx on public.noticias (publicado_em desc) where ativo;
create index noticias_criado_por_idx on public.noticias (criado_por);
create trigger noticias_atualizado_em before update on public.noticias
  for each row execute function public.tg_set_atualizado_em();
alter table public.noticias enable row level security;
create policy noticias_ler on public.noticias for select to anon, authenticated
  using ((ativo and publicado_em <= now()) or (select public.eh_admin()));
create policy noticias_admin_incluir on public.noticias for insert to authenticated with check ((select public.eh_admin()));
create policy noticias_admin_alterar on public.noticias for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy noticias_admin_apagar on public.noticias for delete to authenticated using ((select public.eh_admin()));

-- Banners: texto + cartão colorido quando não há foto ------------------------------
alter table public.banners alter column imagem_url drop not null;
alter table public.banners add column descricao text;
alter table public.banners add column icone text;
alter table public.banners add column cor text check (cor is null or cor ~ '^#[0-9A-Fa-f]{6}$');

-- Locais: categorias que existiam no Bubble ---------------------------------------
alter table public.locais drop constraint locais_categoria_check;
alter table public.locais add constraint locais_categoria_check
  check (categoria in ('administracao', 'saude', 'seguranca', 'emergencia', 'educacao', 'assistencia',
                       'cultura', 'esporte', 'servicos', 'justica', 'transporte', 'outros'));

-- Rótulo mais claro para quem acabou de enviar
create or replace function public.status_rotulo(s public.status_solicitacao)
returns text language sql immutable set search_path = public as $$
  select case s
    when 'aberta'      then 'Recebida'
    when 'em_analise'  then 'Em análise'
    when 'em_execucao' then 'Em execução'
    when 'concluida'   then 'Concluída'
    when 'indeferida'  then 'Não atendida'
    when 'cancelada'   then 'Cancelada'
  end;
$$;

-- Tela inicial: inclui notícias e a cor/ícone da categoria do evento ----------------
create or replace function public.inicio()
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'banners', coalesce((select jsonb_agg(b order by b.ordem, b.criado_em desc) from (
        select id, titulo, descricao, imagem_url, icone, cor, link, ordem, criado_em from public.banners
         where ativo and (inicio_em is null or inicio_em <= now()) and (fim_em is null or fim_em > now())
         order by ordem, criado_em desc limit 8) b), '[]'::jsonb),
    'avisos', coalesce((select jsonb_agg(a order by a.fixado desc, a.publicado_em desc) from (
        select id, titulo, resumo, imagem_url, link, fixado, publicado_em from public.avisos
         where ativo and publicado_em <= now() and (expira_em is null or expira_em > now())
         order by fixado desc, publicado_em desc limit 5) a), '[]'::jsonb),
    'eventos', coalesce((select jsonb_agg(e order by e.inicio_em) from (
        select ev.id, ev.titulo, ev.imagem_url, ev.local_nome, ev.inicio_em, ev.fim_em,
               c.nome as categoria, c.cor, c.icone
          from public.eventos ev left join public.categorias_evento c on c.id = ev.categoria_id
         where ev.ativo and coalesce(ev.fim_em, ev.inicio_em + interval '2 hours') >= now()
         order by ev.inicio_em limit 5) e), '[]'::jsonb),
    'noticias', coalesce((select jsonb_agg(n order by n.publicado_em desc) from (
        select id, titulo, resumo, imagem_url, publicado_em from public.noticias
         where ativo and publicado_em <= now()
         order by publicado_em desc limit 3) n), '[]'::jsonb),
    'servicos_destaque', coalesce((select jsonb_agg(s order by s.ordem, s.nome) from (
        select id, nome, imagem_url, icone, link_externo, tipo_solicitacao_id, ordem from public.servicos
         where ativo and destaque order by ordem, nome limit 8) s), '[]'::jsonb)
  );
$$;

revoke all on public.bairros, public.categorias_evento, public.noticias from anon;
grant select on public.bairros, public.categorias_evento, public.noticias to anon;
