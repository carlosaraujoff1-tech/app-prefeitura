-- SAP Cidadão — tabelas principais.
-- Segurança (RLS) fica em 20261109190100_rls.sql. Nada aqui é liberado sozinho.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
create extension if not exists unaccent with schema extensions;

create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;

-- Configurações internas (nunca expostas ao app).
create table privado.config (
  chave text primary key,
  valor text not null
);

create or replace function privado.cfg(p_chave text)
returns text language sql stable security definer set search_path = privado as $$
  select valor from privado.config where chave = p_chave;
$$;

-- Tentativas de login por CPF (limite contra robôs). Usada pela função "entrar".
create table privado.tentativas_login (
  id        bigint generated always as identity primary key,
  chave     text not null,           -- hash do CPF ou IP
  sucesso   boolean not null default false,
  criado_em timestamptz not null default now()
);
create index tentativas_login_chave_idx on privado.tentativas_login (chave, criado_em desc);

-- Utilitários -----------------------------------------------------------------

create or replace function public.tg_set_atualizado_em()
returns trigger language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

create or replace function public.so_digitos(p text)
returns text language sql immutable set search_path = public as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '');
$$;

-- Validação oficial dos 2 dígitos verificadores do CPF.
create or replace function public.cpf_valido(p text)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  c text := public.so_digitos(p);
  s int; d1 int; d2 int; i int;
begin
  if c is null or length(c) <> 11 or c ~ '^(\d)\1{10}$' then
    return false;
  end if;
  s := 0;
  for i in 1..9 loop s := s + substr(c, i, 1)::int * (11 - i); end loop;
  d1 := (s * 10) % 11; if d1 = 10 then d1 := 0; end if;
  s := 0;
  for i in 1..10 loop s := s + substr(c, i, 1)::int * (12 - i); end loop;
  d2 := (s * 10) % 11; if d2 = 10 then d2 := 0; end if;
  return d1 = substr(c, 10, 1)::int and d2 = substr(c, 11, 1)::int;
end $$;

-- Tipos -----------------------------------------------------------------------

create type public.tipo_usuario as enum ('cidadao', 'servidor', 'admin');

create type public.status_solicitacao as enum (
  'aberta',        -- cidadão acabou de enviar
  'em_analise',    -- secretaria recebeu e está avaliando
  'em_execucao',   -- equipe trabalhando
  'concluida',     -- resolvido
  'indeferida',    -- não será atendida (com justificativa)
  'cancelada'      -- cancelada pelo próprio cidadão
);

-- Secretarias -----------------------------------------------------------------

create table public.secretarias (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null unique,
  sigla         text,
  telefone      text,
  email         text,
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger secretarias_atualizado_em before update on public.secretarias
  for each row execute function public.tg_set_atualizado_em();

-- Perfis (1 para 1 com auth.users) -------------------------------------------

create table public.perfis (
  id            uuid primary key references auth.users(id) on delete cascade,
  nome          text not null,
  cpf           text not null unique check (public.cpf_valido(cpf) and cpf = public.so_digitos(cpf)),
  email         text,
  telefone      text,
  cep           text,
  logradouro    text,
  numero        text,
  complemento   text,
  bairro        text,
  cidade        text not null default 'Santo Antônio da Platina',
  uf            text not null default 'PR',
  tipo          public.tipo_usuario not null default 'cidadao',
  secretaria_id uuid references public.secretarias(id) on delete set null,
  ativo         boolean not null default true,
  notificacoes_lidas_em timestamptz not null default now(),
  termos_aceitos_em     timestamptz,
  ultimo_acesso timestamptz,
  bubble_id     text unique,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint servidor_tem_secretaria check (tipo <> 'servidor' or secretaria_id is not null)
);
create index perfis_tipo_idx on public.perfis (tipo) where tipo <> 'cidadao';
create index perfis_secretaria_idx on public.perfis (secretaria_id);
create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.tg_set_atualizado_em();

-- Conteúdo público: banners, avisos, serviços, locais, eventos ---------------

create table public.banners (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  imagem_url    text not null,          -- 2:1 (1200x600), WebP
  link          text,                   -- rota do app (/servicos/…) ou https://
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  inicio_em     timestamptz,
  fim_em        timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger banners_atualizado_em before update on public.banners
  for each row execute function public.tg_set_atualizado_em();

create table public.avisos (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  resumo        text not null,
  conteudo      text,
  imagem_url    text,                   -- 16:9, WebP
  link          text,
  fixado        boolean not null default false,
  ativo         boolean not null default true,
  publicado_em  timestamptz not null default now(),
  expira_em     timestamptz,
  criado_por    uuid references public.perfis(id) on delete set null,
  bubble_id     text unique,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index avisos_publicados_idx on public.avisos (fixado desc, publicado_em desc) where ativo;
create trigger avisos_atualizado_em before update on public.avisos
  for each row execute function public.tg_set_atualizado_em();

create table public.tipos_solicitacao (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null unique,
  descricao         text,
  secretaria_id     uuid not null references public.secretarias(id),
  icone             text,
  prazo_dias        integer check (prazo_dias is null or prazo_dias between 1 and 365),
  exige_foto        boolean not null default false,
  exige_localizacao boolean not null default false,
  ordem             integer not null default 0,
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create trigger tipos_solicitacao_atualizado_em before update on public.tipos_solicitacao
  for each row execute function public.tg_set_atualizado_em();

create table public.servicos (
  id                  uuid primary key default gen_random_uuid(),
  nome                text not null,
  descricao           text,
  categoria           text,
  imagem_url          text,             -- 1:1, WebP
  icone               text,
  link_externo        text check (link_externo is null or link_externo ~* '^https?://'),
  tipo_solicitacao_id uuid references public.tipos_solicitacao(id) on delete set null,
  destaque            boolean not null default false,
  ordem               integer not null default 0,
  ativo               boolean not null default true,
  bubble_id           text unique,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now(),
  constraint servico_tem_destino check (link_externo is not null or tipo_solicitacao_id is not null or descricao is not null)
);
-- Evita serviços repetidos (problema visto no Bubble).
create unique index servicos_nome_unico on public.servicos (lower(nome));
create trigger servicos_atualizado_em before update on public.servicos
  for each row execute function public.tg_set_atualizado_em();

create table public.locais (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  categoria     text not null default 'outros'
                check (categoria in ('administracao', 'saude', 'seguranca', 'emergencia', 'educacao',
                                     'assistencia', 'cultura', 'esporte', 'outros')),
  descricao     text,
  endereco      text,
  telefone      text,
  whatsapp      text,
  horario       text,
  latitude      double precision check (latitude is null or latitude between -90 and 90),
  longitude     double precision check (longitude is null or longitude between -180 and 180),
  telefone_util boolean not null default true,   -- aparece em "Telefones úteis"
  ordem         integer not null default 0,
  ativo         boolean not null default true,
  bubble_id     text unique,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger locais_atualizado_em before update on public.locais
  for each row execute function public.tg_set_atualizado_em();

create table public.eventos (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null,
  descricao     text,
  categoria     text,
  imagem_url    text,                   -- 1:1, WebP
  local_nome    text,
  local_id      uuid references public.locais(id) on delete set null,
  inicio_em     timestamptz not null,
  fim_em        timestamptz,
  ativo         boolean not null default true,
  bubble_id     text unique,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint evento_fim_depois check (fim_em is null or fim_em >= inicio_em)
);
create index eventos_inicio_idx on public.eventos (inicio_em) where ativo;
create trigger eventos_atualizado_em before update on public.eventos
  for each row execute function public.tg_set_atualizado_em();

-- Solicitações do cidadão ------------------------------------------------------

create sequence public.solicitacoes_protocolo_seq;

create table public.solicitacoes (
  id                uuid primary key default gen_random_uuid(),
  protocolo         text not null unique,
  cidadao_id        uuid references public.perfis(id) on delete set null,
  cidadao_nome      text not null,            -- cópia no momento da abertura
  cidadao_telefone  text,
  tipo_id           uuid not null references public.tipos_solicitacao(id),
  secretaria_id     uuid not null references public.secretarias(id),
  descricao         text not null check (length(descricao) between 10 and 2000),
  endereco          text,
  bairro            text,
  ponto_referencia  text,
  latitude          double precision check (latitude is null or latitude between -90 and 90),
  longitude         double precision check (longitude is null or longitude between -180 and 180),
  status            public.status_solicitacao not null default 'aberta',
  prazo_em          date,
  concluida_em      timestamptz,
  avaliacao_nota    smallint check (avaliacao_nota between 1 and 5),
  avaliacao_comentario text check (length(avaliacao_comentario) <= 500),
  avaliada_em       timestamptz,
  bubble_id         text unique,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);
create index solicitacoes_cidadao_idx on public.solicitacoes (cidadao_id, criado_em desc);
create index solicitacoes_secretaria_idx on public.solicitacoes (secretaria_id, status, criado_em desc);
create index solicitacoes_tipo_idx on public.solicitacoes (tipo_id);
create trigger solicitacoes_atualizado_em before update on public.solicitacoes
  for each row execute function public.tg_set_atualizado_em();

-- Linha do tempo (cada mudança de status ou mensagem da prefeitura).
create table public.solicitacao_historico (
  id              bigint generated always as identity primary key,
  solicitacao_id  uuid not null references public.solicitacoes(id) on delete cascade,
  status          public.status_solicitacao,
  mensagem        text check (length(mensagem) <= 2000),
  interno         boolean not null default false,   -- nota só para servidores
  autor_id        uuid references public.perfis(id) on delete set null,
  criado_em       timestamptz not null default now()
);
create index solicitacao_historico_idx on public.solicitacao_historico (solicitacao_id, criado_em);
create index solicitacao_historico_autor_idx on public.solicitacao_historico (autor_id);

-- Fotos (ficam no bucket privado "solicitacoes").
create table public.solicitacao_anexos (
  id              uuid primary key default gen_random_uuid(),
  solicitacao_id  uuid not null references public.solicitacoes(id) on delete cascade,
  caminho         text not null unique,     -- <solicitacao_id>/<arquivo>.webp
  autor_id        uuid references public.perfis(id) on delete set null,
  criado_em       timestamptz not null default now()
);
create index solicitacao_anexos_idx on public.solicitacao_anexos (solicitacao_id);
create index solicitacao_anexos_autor_idx on public.solicitacao_anexos (autor_id);

-- Lembretes de eventos da agenda ------------------------------------------------

create table public.lembretes_evento (
  id                  uuid primary key default gen_random_uuid(),
  usuario_id          uuid not null references public.perfis(id) on delete cascade,
  evento_id           uuid not null references public.eventos(id) on delete cascade,
  antecedencia_minutos integer not null check (antecedencia_minutos between 5 and 10080),
  enviar_em           timestamptz not null,
  enviado_em          timestamptz,
  criado_em           timestamptz not null default now(),
  unique (usuario_id, evento_id)
);
create index lembretes_pendentes_idx on public.lembretes_evento (enviar_em) where enviado_em is null;
create index lembretes_evento_idx on public.lembretes_evento (evento_id);

-- Registro de erros do app (para corrigir rápido) ------------------------------

create table public.erros_app (
  id          bigint generated always as identity primary key,
  mensagem    text not null check (length(mensagem) <= 2000),
  stack       text check (length(stack) <= 8000),
  tela        text,
  plataforma  text,
  versao_app  text,
  usuario_id  uuid references public.perfis(id) on delete set null,
  criado_em   timestamptz not null default now()
);
create index erros_app_criado_idx on public.erros_app (criado_em desc);
create index erros_app_usuario_idx on public.erros_app (usuario_id);
