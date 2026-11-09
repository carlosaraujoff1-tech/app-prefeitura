# Dossiê técnico — SAP Cidadão (Prefeitura de Santo Antônio da Platina – PR)

Atualizado em 09/11/2026. Repositório: `carlosaraujoff1-tech/app-prefeitura` (branch `main`).
Responsável técnico: Carlos (carlosaraujoff1@gmail.com), único de TI. Comunicação em português, simples, sem jargão.

---

## 1. Visão geral

**O que é.** App do cidadão que substitui o "SAP Cidadão" feito em Bubble.io (nunca publicado em loja). Mais um painel web para servidores e administradores.

**Quem usa.**
- **Cidadão:** vê avisos, agenda, serviços, locais/telefones; abre solicitações (ex.: buraco na rua), acompanha o andamento e recebe avisos; ativa lembrete de eventos ("me avise X antes").
- **Servidor:** atende as solicitações da **sua secretaria** (muda status, escreve ao cidadão, notas internas, encaminha para outra secretaria). Usa o painel web.
- **Administrador:** tudo do servidor em todas as secretarias + cadastra conteúdo (avisos, banners, serviços, locais, eventos, tipos de solicitação), usuários e notificações gerais.

**Prioridades:** velocidade (cidade de ~50 mil habitantes, celulares simples) e acessibilidade (idosos).

**Status (09/11/2026):** Etapa 1 (banco) aplicada e testada. Etapas 2–5 não iniciadas.

---

## 2. Stack e infraestrutura

- **App:** Expo SDK 58 (`expo ~58.0.23`), React Native 0.88, React 19.3, TypeScript ~6.0 (strict), Expo Router (rotas em `src/app`), `reactCompiler` e `typedRoutes` ligados. TanStack Query entra na Etapa 2.
- Pacote Android / iOS: `br.gov.pr.santoantoniodaplatina.sapcidadao` (definitivo). Scheme: `sapcidadao`. `runtimeVersion: fingerprint`.
- **Backend — Supabase** projeto `sap-cidadao` (`jgmcmdkbmuhpfjbykgbg`), região **São Paulo (sa-east-1)**, organização "CA APPS", plano grátis por enquanto (**contratar Pro antes de usar com cidadãos reais**). O projeto antigo "app prefeitura" (EUA, vazio) foi **pausado** em 09/11/2026; pode ser apagado pelo dono.
- Extensões: `pg_net`, `pg_cron`, `unaccent`, `pgcrypto`.
- **Painel web:** Vite + React + react-router (HashRouter), EAS Hosting (Etapa 3).
- **Push:** Expo Push + FCM (Etapa 4). **E-mail:** Resend via SMTP do Supabase (Etapa 4; e-mail provisório de contato: carlosaraujoff1@gmail.com).

**Variáveis (só nomes):** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (públicas). Secrets das Edge Functions (futuros): `RESEND_API_KEY`, `EXPO_ACCESS_TOKEN` (opcional). Banco, tabela `privado.config`: `edge_functions_url`, `push_segredo` (gerado no banco, nunca sai dele).

---

## 3. Banco de dados

### 3.1 Tabelas (`public`)
- **perfis** (1:1 `auth.users`): nome, **cpf (único, validado)**, email (cópia do login), telefone, cep, logradouro, numero, complemento, bairro, cidade, uf, **tipo** (`cidadao|servidor|admin`), secretaria_id (obrigatória para servidor), ativo, notificacoes_lidas_em, termos_aceitos_em, ultimo_acesso, bubble_id.
- **secretarias**: nome, sigla, telefone, email, ordem, ativo.
- **tipos_solicitacao**: nome, descricao, secretaria_id (quem atende), icone, prazo_dias, exige_foto, exige_localizacao, ordem, ativo.
- **solicitacoes**: protocolo (`AAAA.NNNNNN`), cidadao_id, cidadao_nome/telefone (cópia), tipo_id, secretaria_id, descricao (10–2000 letras), endereco, bairro, ponto_referencia, latitude/longitude, **status**, prazo_em, concluida_em, avaliacao_nota (1–5), avaliacao_comentario.
- **solicitacao_historico**: linha do tempo (status, mensagem, `interno` = só equipe, autor_id).
- **solicitacao_anexos**: fotos no bucket privado `solicitacoes` (caminho `<id da solicitação>/<arquivo>`), máx. 10 por solicitação.
- **servicos**: nome (**único**, sem repetidos), descricao, categoria, imagem_url, icone, link_externo (site), tipo_solicitacao_id (opcional: abre solicitação no app), destaque, ordem, ativo.
- **locais**: nome, categoria, endereço, telefone, whatsapp, horário, latitude/longitude, telefone_util (aparece em "Telefones úteis").
- **eventos** (agenda): título, descrição, categoria, imagem, local, início/fim.
- **lembretes_evento**: usuario_id, evento_id, antecedencia_minutos (5 min a 7 dias), enviar_em, enviado_em.
- **banners** (2:1), **avisos** (avisos da prefeitura; fixado, expira_em).
- **notificacoes**, **dispositivos_push**, **eventos_push** (modelos de texto), **fila_push**, **erros_app**.
- Schema `privado` (fechado): `config`, `tentativas_login`, funções internas.

### 3.2 Status da solicitação
`aberta` → `em_analise` → `em_execucao` → `concluida`; ou `indeferida` (exige justificativa ao cidadão); ou `cancelada` (pelo cidadão, só enquanto `aberta`/`em_analise`). Só o admin reabre finalizadas.

### 3.3 Funções (RPC)
- Cidadão: `abrir_solicitacao`, `cancelar_solicitacao`, `avaliar_solicitacao`, `definir_lembrete`, `excluir_minha_conta`, `registrar_dispositivo`, `remover_dispositivo`, `notificacoes_nao_lidas`, `marcar_notificacoes_lidas`, `registrar_acesso`.
- Todos (inclusive sem login): `inicio()` — banners, avisos, próximos eventos e serviços em destaque **em uma única chamada** (rapidez).
- Equipe: `atualizar_solicitacao(id, status, mensagem, interno)`, `transferir_solicitacao(id, secretaria, mensagem)`.
- Apoio da RLS: `eh_admin`, `eh_equipe`, `minha_secretaria`, `pode_ver_solicitacao`, `pode_atender_solicitacao`.
- Só Edge Function: `reservar_fila_push`, `push_segredo_confere`.

### 3.4 Segurança (RLS)
- RLS em todas as tabelas. Conteúdo público (banners, avisos, serviços, locais, eventos, tipos, secretarias) **é legível sem login** (decisão: o cidadão consulta informações sem precisar de conta; conta só para solicitações e lembretes).
- Solicitações: dono, servidor da secretaria responsável e admin. Gravação direta proibida; só pelas funções.
- Cidadão não altera tipo, secretaria, CPF, e-mail, ativo (trigger `tg_perfis_protege_campos`).
- Cadastro: trigger `tg_novo_usuario` cria o perfil a partir dos dados enviados no cadastro e **recusa CPF inválido ou repetido**.
- Exclusão de conta (LGPD): apaga a conta e os dados pessoais; as solicitações ficam como registro público **sem nome/telefone**.

### 3.5 Notificações automáticas (texto editável em `eventos_push`)
- `solicitacao_status` e `solicitacao_mensagem` → cidadão (não dispara para notas internas nem quando o próprio cidadão age).
- `solicitacao_nova` → servidores da secretaria + admins.
- `lembrete_evento` → quem ativou o sino (cron a cada minuto; se o horário do evento muda, o lembrete acompanha).
- Fluxo: `notificacoes` → `fila_push` → `pg_net` chama a Edge Function `processar-fila-push` (Etapa 4) com cabeçalho `x-push-segredo`; cron reprocessa a cada minuto, até 5 tentativas.

### 3.6 Testes
`supabase/testes/rls_solicitacoes.sql` (31 verificações) e `rls_conteudo.sql` (4) — rodam e **desfazem tudo**. Último resultado (09/11/2026): todas ok.
Obs.: o teste consome números da sequência de protocolo (não volta no rollback). Antes do lançamento: `select setval('public.solicitacoes_protocolo_seq', 1, false);`.

---

## 4. Decisões

- **Banco em São Paulo**, não nos EUA: ~120–150 ms a menos por chamada.
- **Login por CPF + senha**, cadastro com CPF, e-mail e endereço. O Supabase só faz login por e-mail; por isso o login por CPF será uma Edge Function `entrar` (Etapa 2) que acha o e-mail pelo CPF **no servidor**, com limite de tentativas (`privado.tentativas_login`). O e-mail nunca é revelado ao app. "Esqueci a senha" por CPF também, mostrando o e-mail mascarado (c***@gmail.com).
- **Mensagem de cadastro duplicado genérica** ("se você já tem cadastro, use Esqueci minha senha"), sem função pública que diga se um CPF existe (evita consulta de CPFs por terceiros).
- **Serviços:** por enquanto abrem site externo; a tabela já aceita ligar um serviço a um tipo de solicitação.
- **Mapa:** lista com distância calculada **no próprio celular** (localização não é enviada ao banco) + botão "Ver no mapa"/"Como chegar" que abre o app de mapas do celular. Mapa com pinos dentro do app fica como melhoria futura (pesa no APK).
- **Lembretes no servidor** (não no celular): funcionam mesmo se o evento mudar de horário.

---

## 5. Pendências

**Do dono**
- Contratar Supabase Pro antes de abrir para cidadãos.
- Apagar (opcional) o projeto pausado "app prefeitura" (EUA).
- Conta de desenvolvedor Google Play/Apple **da prefeitura** (organização). Ver com a prefeitura.
- Enviar: prints das telas de login/cadastro/solicitação, CSVs do Bubble, brasão em alta resolução (PNG fundo transparente).
- Definir controlador (Prefeitura, CNPJ) e encarregado de dados (LGPD) para a política de privacidade.

**Técnicas**
- Etapa 2: app do cidadão. Etapa 3: painel. Etapa 4: push/e-mail. Etapa 5: publicação.
- Criar projeto no expo.dev (conta da prefeitura ou do Carlos) e `eas.json`.
- Zerar a sequência de protocolos antes do lançamento.
