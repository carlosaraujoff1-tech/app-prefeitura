-- SAP Cidadão — importação dos dados exportados do Bubble em 09/11/2026.
-- Fora da importação: usuários, ocorrências, notificações, lembretes e histórico de status
-- (dados de teste), registros "ssss"/"TRSTR" (lixo) e telefones fictícios (+55 11 …).
-- Os arquivos vieram só com 7 colunas: locais sem nome/telefone e eventos sem título.
-- Nomes marcados "(confirmar)" serão corrigidos quando chegar a exportação completa.
-- Horários do Bubble considerados no horário de Brasília.

insert into public.bairros (nome, ordem) values
  ('Centro', 1), ('Platina', 2), ('Monte Real', 3), ('Conselheiro Zacarias', 4),
  ('Contorno', 5), ('Vila Santa Cruz', 6), ('Augusta', 7)
on conflict (nome) do nothing;

insert into public.categorias_evento (nome, descricao, cor, icone, ordem, bubble_id) values
  ('Saúde',      'Eventos e campanhas relacionadas à saúde pública',      '#1B7A3D', 'heart-pulse',  1, '1789088294162x658198233301603200'),
  ('Cultura',    'Eventos culturais do município',                         '#B4500C', 'drama-masks',  2, '1789088328330x205704710166343400'),
  ('Prefeitura', 'Eventos e comunicados da administração municipal',       '#0B4A8F', 'domain',       3, '1789088337739x646074208937889700'),
  ('Educação',   'Eventos relacionados à educação municipal',              '#6A3FB5', 'school',       4, '1789088368211x153352543966887020'),
  ('Esporte',    'Eventos esportivos municipais',                          '#2E6B30', 'trophy',       5, '1789088377921x349790913700174000')
on conflict (nome) do nothing;

-- Eventos de 10/09/2026 (títulos e locais conferidos nos prints do app antigo).
insert into public.eventos (titulo, descricao, categoria_id, local_nome, inicio_em, fim_em)
select v.titulo, v.descricao, c.id, v.local_nome,
       (v.inicio::timestamp at time zone 'America/Sao_Paulo'), (v.fim::timestamp at time zone 'America/Sao_Paulo')
  from (values
    ('Campanha de Vacinação contra a Gripe',
     'Campanha municipal de vacinação contra a gripe aberta à população. Levar documento pessoal e carteira de vacinação.',
     'Saúde', 'UBS Central', '2026-09-10 08:00', '2026-09-10 17:00'),
    ('Atendimento Especial do IPTU',
     'Atendimento especial para cidadãos que precisam de auxílio, segunda via ou informações sobre IPTU.',
     'Prefeitura', 'Prefeitura Municipal', '2026-09-10 09:00', '2026-09-10 16:00'),
    ('Apresentação Cultural Municipal',
     'Evento cultural com apresentações de artistas e grupos locais.',
     'Cultura', 'Praça Central', '2026-09-10 19:00', '2026-09-10 21:30')
  ) as v(titulo, descricao, categoria, local_nome, inicio, fim)
  join public.categorias_evento c on c.nome = v.categoria
 where not exists (select 1 from public.eventos e where e.titulo = v.titulo and e.inicio_em = (v.inicio::timestamp at time zone 'America/Sao_Paulo'));

insert into public.avisos (titulo, resumo, publicado_em)
select v.titulo, v.resumo, v.pub::timestamp at time zone 'America/Sao_Paulo'
  from (values
    ('Ponto facultativo nesta sexta-feira', 'Os serviços municipais essenciais funcionarão em esquema de plantão.', '2026-08-16 06:00'),
    ('Manutenção programada no sistema de água', 'Haverá interrupção no abastecimento em alguns bairros para melhorias.', '2026-08-10 00:30'),
    ('Resultado do concurso público 2026', 'Confira a lista completa de aprovados no concurso da Prefeitura.', '2026-07-05 07:15'),
    ('Reforma da Praça Central', 'Projeto de revitalização da Praça Central começa este mês.', '2026-06-20 01:45')
  ) as v(titulo, resumo, pub)
 where not exists (select 1 from public.avisos a where a.titulo = v.titulo);

insert into public.noticias (titulo, resumo, conteudo, publicado_em)
select v.titulo, v.conteudo, v.conteudo, v.pub::timestamp at time zone 'America/Sao_Paulo'
  from (values
    ('Prefeitura lança programa de emprego jovem', 'O novo programa oferece vagas de estágio e capacitação para jovens entre 16 e 24 anos.', '2026-08-17 07:30'),
    ('Nova frota de ônibus começa a operar', 'Os novos veículos contam com ar-condicionado e acessibilidade ampliada.', '2026-08-15 02:10'),
    ('Parque Linear é inaugurado na zona leste', 'O parque linear oferece ciclovia, pista de caminhada e áreas de convivência.', '2026-07-20 08:00'),
    ('Biblioteca Municipal amplia horário de funcionamento', 'A biblioteca agora funciona também aos finais de semana, com programação cultural.', '2026-06-29 23:20')
  ) as v(titulo, conteudo, pub)
 where not exists (select 1 from public.noticias n where n.titulo = v.titulo);

-- Banners: as fotos do Bubble eram de banco de imagens e ficam no servidor do Bubble.
-- Viram cartões coloridos com ícone; a prefeitura pode trocar por fotos pelo painel.
insert into public.banners (titulo, descricao, icone, cor, link, ordem)
select * from (values
  ('IPTU 2026 disponível', 'Emita a 2ª via do seu IPTU de forma rápida pelo aplicativo.', 'file-document-outline', '#0B4A8F', '/servicos', 1),
  ('Agende sua consulta na UBS', 'Agende consultas médicas nas unidades básicas de saúde sem sair de casa.', 'stethoscope', '#1B7A3D', '/servicos', 2),
  ('Novo aplicativo da Prefeitura', 'Conheça os novos recursos do aplicativo oficial da prefeitura.', 'cellphone-check', '#08376B', null, 3),
  ('Mutirão de Limpeza Urbana', 'Participe do mutirão para manter nossa cidade limpa e organizada.', 'broom', '#2E6B30', null, 4),
  ('Campanha de Vacinação Infantil', 'Leve seu filho para atualizar a carteira de vacinação.', 'needle', '#A3361F', '/agenda', 5),
  ('Audiência Pública do Orçamento', 'Participe e opine sobre as prioridades do orçamento municipal.', 'account-group', '#6A3FB5', '/agenda', 6)
) as v(titulo, descricao, icone, cor, link, ordem)
 where not exists (select 1 from public.banners b where b.titulo = v.titulo);

-- Serviços: no Bubble cada serviço aparecia 2 vezes; aqui fica 1 de cada, com os 2 textos.
-- Link provisório: site oficial da prefeitura (trocar pelo link de cada serviço no painel).
insert into public.servicos (nome, descricao, categoria, icone, link_externo, destaque, ordem)
select * from (values
  ('2ª via de IPTU', 'Emita gratuitamente a segunda via do seu carnê de IPTU. Consulte débitos e imprima a 2ª via atualizada.', 'Tributos', 'file-document-outline', 'https://www.santoantoniodaplatina.pr.gov.br/', true, 1),
  ('IPTU em atraso', 'Negocie débitos de IPTU em atraso e gere boletos de parcelamento. Simule acordos e veja descontos para pagamento à vista.', 'Tributos', 'cash-clock', 'https://www.santoantoniodaplatina.pr.gov.br/', false, 2),
  ('Certidão Negativa', 'Emita certidão negativa de débitos municipais para diversas finalidades e faça o download imediato.', 'Tributos', 'file-certificate-outline', 'https://www.santoantoniodaplatina.pr.gov.br/', true, 3),
  ('Agendar consulta na UBS', 'Agende consultas nas UBS mais próximas da sua casa. Veja horários disponíveis e selecione o profissional de saúde.', 'Saúde', 'stethoscope', 'https://www.santoantoniodaplatina.pr.gov.br/', true, 4),
  ('Alvarás e Licenças', 'Solicite ou renove alvarás comerciais e licenças de funcionamento, e acompanhe o andamento do seu pedido.', 'Empresas', 'store-check-outline', 'https://www.santoantoniodaplatina.pr.gov.br/', false, 5),
  ('Coleta de Entulho', 'Agende a coleta de entulho e restos de construção na sua rua. Confira as orientações para descarte correto de resíduos volumosos.', 'Cidade', 'dump-truck', 'https://www.santoantoniodaplatina.pr.gov.br/', true, 6),
  ('Vagas de Emprego', 'Consulte vagas de emprego disponíveis no município e cadastre seu currículo para ser encontrado por empresas locais.', 'Trabalho', 'briefcase-outline', 'https://www.santoantoniodaplatina.pr.gov.br/', false, 7)
) as v(nome, descricao, categoria, icone, link_externo, destaque, ordem)
on conflict do nothing;

-- Secretaria e tipos de solicitação (a partir das categorias de ocorrência do Bubble).
-- Nome da secretaria provisório: ajustar no painel conforme o organograma real.
insert into public.secretarias (nome, ordem) values ('Obras e Serviços Urbanos', 1)
on conflict (nome) do nothing;

insert into public.tipos_solicitacao (nome, descricao, secretaria_id, icone, exige_localizacao, ordem)
select v.nome, v.descricao, s.id, v.icone, true, v.ordem
  from (values
    ('Buraco na rua', 'Buracos, crateras e asfalto danificado.', 'road-variant', 1),
    ('Iluminação pública', 'Poste apagado, piscando ou lâmpada queimada.', 'lightbulb-on-outline', 2),
    ('Lixo e limpeza', 'Lixo acumulado, coleta não realizada, lixeira cheia.', 'trash-can-outline', 3),
    ('Água, esgoto e alagamento', 'Vazamentos, bueiro entupido, rua alagada.', 'water-alert-outline', 4)
  ) as v(nome, descricao, icone, ordem)
  cross join (select id from public.secretarias where nome = 'Obras e Serviços Urbanos') s
on conflict (nome) do nothing;

-- Locais (coordenadas tiradas dos links do Google Maps exportados).
insert into public.locais (nome, categoria, descricao, endereco, latitude, longitude, ordem)
select * from (values
  ('Prefeitura Municipal', 'administracao', 'IPTU, protocolos, certidões e serviços municipais.', null, -23.295123, -50.077456, 1),
  ('Hospital Nossa Senhora da Saúde', 'saude', null, 'R. Joaquim Ribeiro, 251 - Centro', -23.2997783, -50.0816152, 2),
  ('Segurança pública (confirmar)', 'seguranca', null, 'R. Mal. Deodoro, 241', -23.2960984, -50.0785885, 3),
  ('Segurança pública (confirmar)', 'seguranca', null, 'R. Sete de Setembro, 1209', -23.2955567, -50.0811477, 4),
  ('Segurança pública (confirmar)', 'seguranca', null, 'R. Rui Barbosa, 1138', -23.2939004, -50.0739211, 5),
  ('Emprego e vagas (confirmar)', 'servicos', 'Empregos e encaminhamento para vagas.', 'Av. Oliveira Motta, 1110', -23.2926719, -50.0751892, 6),
  ('Assistência Social (confirmar)', 'assistencia', 'Assistência social, benefícios e programas municipais.', 'R. Pref. Arnolfo Alves, 70', -23.2778018, -50.0713836, 7),
  ('Justiça (confirmar)', 'justica', null, 'Av. Oliveira Motta, 745', -23.2943056, -50.0785688, 8),
  ('Transporte (confirmar)', 'transporte', null, 'R. Cel. Capucho, 1314', -23.2980212, -50.0727287, 9),
  ('Serviço público (confirmar)', 'servicos', null, 'R. Mal. Deodoro da Fonseca, 531 - Centro', -23.2963237, -50.07936, 10)
) as v(nome, categoria, descricao, endereco, latitude, longitude, ordem)
 where not exists (select 1 from public.locais l where l.endereco is not distinct from v.endereco and l.nome = v.nome);

-- Telefones de emergência (números nacionais). Os números "+55 11 …" do Bubble eram fictícios.
insert into public.locais (nome, categoria, descricao, telefone, ordem)
select * from (values
  ('SAMU', 'emergencia', 'Urgência e emergência médica', '192', 101),
  ('Corpo de Bombeiros', 'emergencia', 'Incêndio, resgate e salvamento', '193', 102),
  ('Polícia Militar', 'emergencia', 'Emergência policial', '190', 103),
  ('Defesa Civil', 'emergencia', 'Enchentes, desabamentos e desastres', '199', 104),
  ('Guarda Civil Municipal', 'emergencia', null, '153', 105)
) as v(nome, categoria, descricao, telefone, ordem)
 where not exists (select 1 from public.locais l where l.telefone = v.telefone);
