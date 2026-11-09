# SAP Cidadão — Funcionalidades: o que temos, o que falta

Atualizado em 09/11/2026.

**Legenda**
- ✅ Pronto e testado (na versão web do app, com o banco de verdade)
- 🟢 Pronto, mas **ainda não testado no celular**
- 🟡 Funciona em parte / provisório
- ⬜ Falta fazer
- 👤 Depende de você (ou da Prefeitura)

> Até o primeiro APK ser instalado, tudo que usa recurso do celular (câmera, GPS, ligar, abrir mapas) está como 🟢.

---

## 1. Visão geral por etapa

| Etapa | Situação |
|---|---|
| 0. Preparação (repositório, projeto Supabase em SP, projeto Expo) | ✅ Feito |
| 1. Banco de dados (tabelas, segurança, regras, testes) | ✅ Feito (35 verificações ok) |
| 2. App do cidadão (telas) | ✅ Feito na web · 🟢 falta testar no celular |
| 2b. Primeiro APK de teste | 🟡 Build em andamento no expo.dev |
| 3. Painel web (servidores e administração) | ⬜ Não iniciado |
| 4. Notificações no celular (push) e e-mail próprio (Resend) | 🟡 Banco pronto · ⬜ envio |
| 5. Publicação na Play Store (e iPhone) | ⬜ Não iniciado |

---

## 2. Telas do app (cidadão)

### 2.1 Início
| Funcionalidade | Situação |
|---|---|
| Saudação com o nome ("Olá, Maria!") ou "Bem-vindo(a)" sem login | ✅ |
| Sino de notificações com número de não lidas | ✅ |
| Cartão "Viu um problema na cidade?" → abre solicitação (ou pede login) | ✅ |
| Banners que deslizam para o lado, com indicador de posição | ✅ |
| Banner com foto (quando a Prefeitura enviar pelo painel) | 🟢 (estrutura pronta, sem fotos ainda) |
| Banner leva a uma tela do app ou a um site | ✅ |
| Acesso rápido: Serviços, Locais, Telefones, Notícias | ✅ |
| Avisos da Prefeitura (3 últimos, com data) + "Ver todos" | ✅ |
| Próximos eventos (ou atalho para a agenda quando não há) | ✅ |
| Notícias (3 últimas) + "Ver todas" | ✅ |
| Puxar para baixo para atualizar | ✅ |
| Abre na hora com o conteúdo guardado no celular (funciona sem internet) | ✅ (web) · 🟢 (celular) |
| Brasão da Prefeitura no topo | ⬜ 👤 falta o arquivo do brasão |

### 2.2 Serviços
| Funcionalidade | Situação |
|---|---|
| Lista de serviços com ícone e descrição (sem repetidos, como havia no Bubble) | ✅ |
| Busca por palavra (ignora acentos) | ✅ |
| Filtro por categoria (Tributos, Saúde, Empresas…) | ✅ |
| Tela do serviço com descrição | ✅ |
| Botão "Acessar serviço" (abre o site dentro do app) | 🟢 |
| Link correto de cada serviço | 🟡 provisório: todos apontam para o site da Prefeitura · 👤 informar os links |
| Serviço que abre solicitação direto no app | 🟢 (estrutura pronta; nenhum serviço ligado ainda) |

### 2.3 Pedidos (minhas solicitações)
| Funcionalidade | Situação |
|---|---|
| Sem login: explica e oferece Entrar / Criar conta | ✅ |
| Lista das minhas solicitações com tipo, protocolo, endereço, status colorido e data | ✅ |
| Botão "Nova solicitação" | ✅ |
| Mensagem amigável quando ainda não há solicitações | ✅ |

### 2.4 Nova solicitação
| Funcionalidade | Situação |
|---|---|
| Passo 1: escolher o tipo (Buraco, Iluminação, Lixo, Água/esgoto) | ✅ |
| Passo 2: "Usar minha localização atual" (GPS) + preenche rua e bairro | 🟢 |
| Endereço digitado, bairro em botões, ponto de referência | ✅ |
| Passo 3: descrição (mín. 10 letras, máx. 2000) | ✅ |
| Passo 4: até 3 fotos pela câmera ou galeria, reduzidas para WebP (~150 KB) | 🟢 |
| Avisos claros dos campos que faltam | ✅ |
| Envio com protocolo (ex.: 2026.000002) e tela de sucesso | ✅ |
| Limite de 10 solicitações por dia por pessoa (contra abuso) | ✅ |
| Mapa para "arrastar o pino" no local exato | ⬜ (ideia futura) |

### 2.5 Detalhe da solicitação
| Funcionalidade | Situação |
|---|---|
| Tipo, protocolo, status em destaque, data de abertura, prazo estimado | ✅ |
| Descrição, local e botão "Ver no mapa" | ✅ / 🟢 (mapa) |
| Fotos enviadas | 🟢 |
| Linha do tempo (Recebida → Em análise → Em execução → Concluída) com mensagens da Prefeitura | ✅ |
| Cancelar (só enquanto não começou a execução) | ✅ |
| Avaliar o atendimento de 1 a 5 estrelas + comentário (quando concluída) | ✅ (regra testada no banco) |
| Atualiza ao puxar para baixo | ✅ |

### 2.6 Agenda
| Funcionalidade | Situação |
|---|---|
| Calendário do mês com setas, hoje marcado, dia escolhido em azul | ✅ |
| Bolinhas coloridas por categoria (Saúde, Cultura, Prefeitura, Educação, Esporte) | ✅ |
| Lista dos eventos do dia (hora, local, categoria) | ✅ |
| Sem eventos no dia: mostra os outros do mês | ✅ |
| Sino "Me avise antes": 15 min, 30 min, 1 h, 2 h, 1 dia, 2 dias | ✅ (regra) |
| Se a Prefeitura mudar o horário do evento, o lembrete acompanha | ✅ (testado no banco) |
| Lembrete chegar como notificação no celular | ⬜ depende da Etapa 4 (hoje aparece na lista de notificações) |
| Tela do evento com data por extenso, horário, local e "Como chegar" | ✅ / 🟢 |
| Eventos futuros reais | ⬜ 👤 só há os 3 eventos de 10/09/2026 vindos do Bubble |

### 2.7 Perfil
| Funcionalidade | Situação |
|---|---|
| Nome, CPF e e-mail | ✅ |
| Menu: Meus dados, Minhas solicitações, Notificações, Telefones, Locais, Privacidade | ✅ |
| Sair da conta | ✅ |
| Excluir minha conta (LGPD) com confirmação | ✅ (regra testada no banco) |
| Versão do app | ✅ |

### 2.8 Entrar / Criar conta / Senha
| Funcionalidade | Situação |
|---|---|
| Entrar com CPF + senha (máscara do CPF, mostrar/esconder senha) | ✅ |
| Mesma mensagem para CPF inexistente e senha errada (ninguém descobre quem tem cadastro) | ✅ |
| Bloqueio após 5 erros por CPF ou 30 por aparelho/rede em 15 min | ✅ |
| Criar conta: nome, CPF (validado), e-mail, celular, endereço, senha forte, aceite da privacidade | ✅ |
| CEP preenche a rua e o bairro automaticamente | 🟢 |
| CPF repetido ou inválido é recusado pelo banco | ✅ |
| E-mail de confirmação de cadastro | 🟡 sai pelo envio padrão do Supabase (poucos por hora, texto em inglês) · ⬜ Resend |
| Esqueci minha senha pelo CPF (mostra e-mail mascarado, ex.: ca***@gmail.com) | 🟢 |
| Link do e-mail volta para o app e cria nova senha | 🟡 👤 falta liberar `sapcidadao://**` no Supabase |

### 2.9 Outras telas
| Tela / Funcionalidade | Situação |
|---|---|
| Locais da cidade: filtro por categoria, endereço, distância calculada no celular, "Ligar", "Como chegar" | ✅ / 🟢 |
| Nomes e telefones dos locais | 🟡 8 locais "(confirmar)" · 👤 reexportar LocalUtils do Bubble |
| Telefones úteis: emergência em destaque (190, 192, 193, 199, 153) | ✅ · 🟢 (ligar) |
| Telefones da Prefeitura e secretarias | ⬜ 👤 informar os números |
| Avisos: lista e detalhe | ✅ |
| Notícias: lista e detalhe | ✅ · fotos ⬜ (vêm pelo painel) |
| Notificações: lista, marca como lidas, toque leva à tela certa | ✅ |
| Política de privacidade | 🟡 texto-base · 👤 Prefeitura revisar |

### 2.10 Do app como um todo
| Funcionalidade | Situação |
|---|---|
| Rapidez: tela inicial numa só consulta; banco em São Paulo; fotos comprimidas | ✅ |
| Funciona sem internet com o último conteúdo visto | ✅ (web) · 🟢 (celular) |
| Letras grandes, botões grandes, alto contraste, leitor de tela | ✅ |
| Respeita o "tamanho da fonte" do celular | 🟢 |
| Ícone do app | 🟡 provisório (prédio público azul) · 👤 brasão |
| Tela de abertura (splash) | 🟡 provisória (mesmo desenho) |
| Atualizações sem reinstalar (canal "preview") | ✅ configurado · 🟢 testar após o 1º APK |
| Registro de erros do app para correção rápida | 🟡 tabela pronta · ⬜ ligar no app |
| Modo escuro | ⬜ (não planejado agora) |
| iPhone | ⬜ 👤 precisa de conta Apple Developer da Prefeitura |

---

## 3. Banco de dados e segurança

| Item | Situação |
|---|---|
| Projeto Supabase `sap-cidadao` em São Paulo | ✅ |
| Segurança em todas as tabelas (cada um só vê o que pode) | ✅ |
| Perfis: cidadão, servidor (só a própria secretaria), administrador | ✅ |
| Solicitações, histórico, fotos privadas, avaliação, cancelamento, encaminhar para outra secretaria | ✅ |
| Lembretes de eventos (verificados a cada minuto) | ✅ |
| Fila de notificações (mesmo padrão da loja) | ✅ |
| Exclusão de conta mantendo a solicitação sem dados pessoais | ✅ |
| Testes automáticos de segurança (desfeitos no final) | ✅ 35 verificações |
| Plano Pro (backup diário, não pausa) | ⬜ 👤 contratar antes de liberar ao público |
| Zerar contador de protocolo antes do lançamento | ⬜ |
| Apagar conta de teste (CPF 529.982.247-25) e solicitação 2026.000002 | ⬜ antes do lançamento |

---

## 4. Painel web (Etapa 3) — ⬜ tudo a fazer

Mesmo padrão da loja (site em `painel-...expo.app`, só servidores e administradores entram).

**Para servidores**
- ⬜ Fila de solicitações da sua secretaria (filtros por status, bairro, tipo, atrasadas)
- ⬜ Abrir solicitação: ver fotos, mapa, dados de contato do cidadão
- ⬜ Mudar status, escrever ao cidadão, nota interna, encaminhar para outra secretaria
- ⬜ Anexar foto do serviço feito

**Para administradores**
- ⬜ Avisos, notícias, banners e eventos (com recorte de imagem e conversão para WebP)
- ⬜ Serviços (com link de cada um) e tipos de solicitação (secretaria, prazo, exige foto/local)
- ⬜ Locais e telefones, bairros, categorias de evento, secretarias
- ⬜ Usuários: tornar alguém servidor/admin, desativar conta
- ⬜ Enviar notificação geral para todos
- ⬜ Editar os textos das notificações automáticas
- ⬜ Relatórios: solicitações por tipo/bairro/secretaria, tempo médio, notas de avaliação
- ⬜ Importar planilha (CSV/Excel) de eventos e locais
- ⬜ Ver erros do app
- ⬜ Páginas públicas: política de privacidade e exclusão de conta (exigidas pela Play Store)

---

## 5. Notificações e e-mail (Etapa 4)

| Item | Situação |
|---|---|
| Banco já cria as notificações (status, mensagem, nova solicitação, lembrete) | ✅ |
| Função que envia ao celular (Expo Push + FCM) | ⬜ |
| App pedir permissão e registrar o celular no login | ⬜ (exige APK novo) |
| Ícone de notificação branco | ⬜ |
| Projeto Firebase + arquivo `google-services.json` | ⬜ 👤 criar projeto no Firebase (te guio) |
| E-mail próprio pelo Resend (textos em português, sem limite baixo) | ⬜ 👤 domínio de e-mail da Prefeitura ou provisório |
| Configurar Site URL e Redirect URLs no Supabase | ⬜ 👤 (te guio, 2 minutos) |

---

## 6. Publicação (Etapa 5)

| Item | Situação |
|---|---|
| APK de teste (instala direto no Android) | 🟡 build em andamento |
| Conta Google Play **da Prefeitura** (organização) + declaração "Apps governamentais" | ⬜ 👤 Prefeitura |
| Teste fechado com testadores antes de produção (confirmar número e dias na Play Console) | ⬜ |
| Ficha da loja: textos, ícone 512×512, imagem 1024×500, capturas de tela | ⬜ (eu preparo, 👤 aprova) |
| Formulário "Segurança dos dados" e classificação de conteúdo | ⬜ (eu preparo as respostas) |
| Pacote `.aab` para a loja (workflow pronto) | ✅ configurado |
| iPhone / App Store | ⬜ 👤 conta Apple Developer |

---

## 7. O que preciso de você (👤), em ordem de prioridade

1. **Instalar o APK** quando eu mandar o link e testar no celular (câmera, GPS, ligar).
2. **Brasão** em alta resolução (PNG com fundo transparente).
3. **Reexportar a tabela LocalUtils** do Bubble com **todas as colunas** (nome e telefone dos locais).
4. **Links reais** de cada serviço (IPTU, certidão, UBS, alvará, entulho, vagas).
5. **Secretarias reais** e qual atende cada tipo de solicitação; telefones da Prefeitura.
6. **Supabase → Authentication → URL Configuration**: adicionar `sapcidadao://**` em Redirect URLs.
7. **Contratar Supabase Pro** antes de abrir para o público.
8. **Prefeitura**: conta Google Play de organização, revisar a política de privacidade, nome e e-mail do encarregado de dados (LGPD).
9. **Firebase** (para notificações) — te guio passo a passo na Etapa 4.

## 8. Próximos passos sugeridos

1. Testar o APK e corrigir o que aparecer (correções chegam sem reinstalar).
2. Etapa 3: painel web (começando pela fila de solicitações dos servidores).
3. Etapa 4: notificações no celular e e-mail próprio (gera o 2º APK).
4. Etapa 5: Play Store.
