-- Teste das regras do banco. Roda tudo e DESFAZ no final (rollback via exceção).
-- Resultado aparece na mensagem de erro "RESULTADO: ...". Qualquer "FALHOU" = problema.
do $teste$
declare
  r text := '';
  a uuid := gen_random_uuid();  -- cidadão A
  b uuid := gen_random_uuid();  -- cidadão B
  sx uuid := gen_random_uuid(); -- servidor da secretaria X
  sy uuid := gen_random_uuid(); -- servidor da secretaria Y
  ad uuid := gen_random_uuid(); -- admin
  sec_x uuid; sec_y uuid; tipo_x uuid; ev uuid;
  sol public.solicitacoes%rowtype;
  n int; ok boolean;
  procedure_dummy int;
begin
  -- Preparação (como dono do banco)
  insert into public.secretarias (nome) values ('Teste Obras') returning id into sec_x;
  insert into public.secretarias (nome) values ('Teste Saúde') returning id into sec_y;
  insert into public.tipos_solicitacao (nome, secretaria_id, prazo_dias, exige_localizacao)
    values ('Teste buraco', sec_x, 15, true) returning id into tipo_x;
  insert into public.eventos (titulo, inicio_em) values ('Teste evento', now() + interval '3 days') returning id into ev;

  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
    (a,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@teste.local',
       '{"nome":"Cidadão A","cpf":"529.982.247-25","telefone":"(43) 99999-0000","logradouro":"Rua 1","bairro":"Centro","termos_aceitos":true}'),
    (b,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@teste.local',
       '{"nome":"Cidadão B","cpf":"111.444.777-35"}'),
    (sx, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sx@teste.local',
       '{"nome":"Servidor X","cpf":"123.456.789-09"}'),
    (sy, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sy@teste.local',
       '{"nome":"Servidor Y","cpf":"935.411.347-80"}'),
    (ad, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ad@teste.local',
       '{"nome":"Admin","cpf":"390.533.447-05"}');
  update public.perfis set tipo = 'servidor', secretaria_id = sec_x where id = sx;
  update public.perfis set tipo = 'servidor', secretaria_id = sec_y where id = sy;
  update public.perfis set tipo = 'admin' where id = ad;
  update public.perfis set notificacoes_lidas_em = now() - interval '1 hour';
  select count(*) into n from public.perfis where id in (a,b,sx,sy,ad);
  r := r || format('[%s] perfis criados pelo cadastro (%s/5)', case when n = 5 then 'ok' else 'FALHOU' end, n) || E'\n';
  select termos_aceitos_em is not null and telefone = '43999990000' and cpf = '52998224725' into ok from public.perfis where id = a;
  r := r || format('[%s] CPF/telefone gravados só com números e termos aceitos', case when ok then 'ok' else 'FALHOU' end) || E'\n';

  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
      (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'x@teste.local', '{"nome":"Fulano","cpf":"123.456.789-00"}');
    r := r || '[FALHOU] cadastro com CPF inválido foi aceito' || E'\n';
  exception when others then r := r || '[ok] cadastro com CPF inválido recusado' || E'\n'; end;
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
      (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'y@teste.local', '{"nome":"Fulano","cpf":"52998224725"}');
    r := r || '[FALHOU] CPF repetido foi aceito' || E'\n';
  exception when others then r := r || '[ok] CPF repetido recusado' || E'\n'; end;

  -- ===== Visitante sem login (anon)
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
  begin
    perform public.inicio();
    r := r || '[ok] visitante abre a tela inicial' || E'\n';
  exception when others then r := r || '[FALHOU] visitante não abre a tela inicial: ' || sqlerrm || E'\n'; end;
  begin
    select count(*) into n from public.perfis;
    r := r || '[FALHOU] visitante leu perfis' || E'\n';
  exception when others then r := r || '[ok] visitante não lê perfis' || E'\n'; end;
  select count(*) into n from public.tipos_solicitacao where id = tipo_x;
  r := r || format('[%s] visitante vê tipos de solicitação', case when n = 1 then 'ok' else 'FALHOU' end) || E'\n';
  perform set_config('role', 'none', true);

  -- ===== Cidadão A
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  begin
    perform public.abrir_solicitacao(tipo_x, 'Buraco grande na rua');
    r := r || '[FALHOU] abriu sem endereço num tipo que exige local' || E'\n';
  exception when others then r := r || '[ok] exige endereço/local: ' || sqlerrm || E'\n'; end;
  sol := public.abrir_solicitacao(tipo_x, 'Buraco grande na rua em frente ao número 10', 'Rua 1, 10', 'Centro');
  r := r || format('[%s] cidadão abriu solicitação, protocolo %s, prazo %s', case when sol.protocolo ~ '^\d{4}\.\d{6}$' then 'ok' else 'FALHOU' end, sol.protocolo, sol.prazo_em) || E'\n';
  begin
    insert into public.solicitacoes (protocolo, cidadao_id, cidadao_nome, tipo_id, secretaria_id, descricao)
      values ('X', a, 'A', tipo_x, sec_x, 'descricao qualquer');
    r := r || '[FALHOU] cidadão gravou direto na tabela' || E'\n';
  exception when others then r := r || '[ok] gravar direto na tabela é proibido' || E'\n'; end;
  begin
    update public.perfis set tipo = 'admin' where id = a;
    r := r || '[FALHOU] cidadão virou admin' || E'\n';
  exception when others then r := r || '[ok] cidadão não vira admin' || E'\n'; end;
  update public.perfis set nome = 'Cidadão A Silva' where id = a;
  get diagnostics n = row_count;
  r := r || format('[%s] cidadão edita o próprio nome', case when n = 1 then 'ok' else 'FALHOU' end) || E'\n';
  begin
    perform public.atualizar_solicitacao(sol.id, 'concluida', 'eu mesmo');
    r := r || '[FALHOU] cidadão mudou status' || E'\n';
  exception when others then r := r || '[ok] cidadão não muda status' || E'\n'; end;
  perform public.definir_lembrete(ev, 60);
  select count(*) into n from public.lembretes_evento where usuario_id = a;
  r := r || format('[%s] lembrete 60 min antes criado', case when n = 1 then 'ok' else 'FALHOU' end) || E'\n';
  perform set_config('role', 'none', true);

  select count(*) into n from public.notificacoes where evento = 'solicitacao_nova' and destinatario_id in (sx, ad);
  select count(*) into procedure_dummy from public.notificacoes where evento = 'solicitacao_nova' and destinatario_id in (sy, a, b);
  r := r || format('[%s] aviso de nova solicitação foi p/ servidor X e admin (%s) e não p/ outros (%s)', case when n = 2 and procedure_dummy = 0 then 'ok' else 'FALHOU' end, n, procedure_dummy) || E'\n';

  -- ===== Cidadão B
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.solicitacoes where id = sol.id;
  r := r || format('[%s] outro cidadão NÃO vê a solicitação', case when n = 0 then 'ok' else 'FALHOU' end) || E'\n';
  select count(*) into n from public.perfis;
  r := r || format('[%s] outro cidadão só vê o próprio perfil (%s)', case when n = 1 then 'ok' else 'FALHOU' end, n) || E'\n';
  select count(*) into n from public.solicitacao_historico where solicitacao_id = sol.id;
  r := r || format('[%s] outro cidadão NÃO vê o histórico', case when n = 0 then 'ok' else 'FALHOU' end) || E'\n';
  perform set_config('role', 'none', true);

  -- ===== Servidor Y (outra secretaria)
  perform set_config('request.jwt.claims', json_build_object('sub', sy, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.solicitacoes where id = sol.id;
  r := r || format('[%s] servidor de outra secretaria NÃO vê', case when n = 0 then 'ok' else 'FALHOU' end) || E'\n';
  begin
    perform public.atualizar_solicitacao(sol.id, 'em_analise');
    r := r || '[FALHOU] servidor de outra secretaria mudou status' || E'\n';
  exception when others then r := r || '[ok] servidor de outra secretaria não muda status' || E'\n'; end;
  perform set_config('role', 'none', true);

  -- ===== Servidor X (secretaria responsável)
  perform set_config('request.jwt.claims', json_build_object('sub', sx, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.solicitacoes where id = sol.id;
  r := r || format('[%s] servidor da secretaria vê', case when n = 1 then 'ok' else 'FALHOU' end) || E'\n';
  perform public.atualizar_solicitacao(sol.id, 'em_analise', 'Equipe vai vistoriar amanhã.');
  perform public.atualizar_solicitacao(sol.id, null, 'Nota interna: levar britadeira', true);
  perform public.atualizar_solicitacao(sol.id, 'em_execucao');
  begin
    perform public.atualizar_solicitacao(sol.id, 'indeferida');
    r := r || '[FALHOU] indeferiu sem justificativa' || E'\n';
  exception when others then r := r || '[ok] indeferir exige justificativa' || E'\n'; end;
  perform set_config('role', 'none', true);

  select count(*) into n from public.notificacoes where destinatario_id = a and evento = 'solicitacao_status';
  r := r || format('[%s] cidadão recebeu 2 avisos de status (%s); nota interna não gerou aviso', case when n = 2 then 'ok' else 'FALHOU' end, n) || E'\n';
  select count(*) into n from public.fila_push;
  r := r || format('[ok] itens na fila de push: %s', n) || E'\n';
  r := r || '     exemplo de texto: ' || coalesce((select titulo || ' / ' || corpo from public.notificacoes where destinatario_id = a and evento = 'solicitacao_status' order by criado_em limit 1), '?') || E'\n';

  -- ===== Cidadão A de novo: histórico e cancelamento
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  select count(*) into n from public.solicitacao_historico where solicitacao_id = sol.id;
  r := r || format('[%s] cidadão vê 3 itens no histórico, sem a nota interna (%s)', case when n = 3 then 'ok' else 'FALHOU' end, n) || E'\n';
  begin
    perform public.cancelar_solicitacao(sol.id);
    r := r || '[FALHOU] cancelou depois de iniciada a execução' || E'\n';
  exception when others then r := r || '[ok] não cancela após início da execução' || E'\n'; end;
  begin
    perform public.avaliar_solicitacao(sol.id, 5);
    r := r || '[FALHOU] avaliou antes de concluir' || E'\n';
  exception when others then r := r || '[ok] só avalia depois de concluída' || E'\n'; end;
  select public.notificacoes_nao_lidas() into n;
  r := r || format('[%s] contador de não lidas = %s', case when n = 2 then 'ok' else 'FALHOU' end, n) || E'\n';
  perform set_config('role', 'none', true);

  -- ===== Lembrete vencido vira notificação
  update public.lembretes_evento set enviar_em = now() - interval '1 minute' where usuario_id = a;
  select privado.processar_lembretes() into n;
  select count(*) into procedure_dummy from public.notificacoes where destinatario_id = a and evento = 'lembrete_evento';
  r := r || format('[%s] lembrete do evento enviado (%s)', case when n = 1 and procedure_dummy = 1 then 'ok' else 'FALHOU' end, procedure_dummy) || E'\n';

  -- ===== Exclusão de conta
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
  perform public.excluir_minha_conta();
  perform set_config('role', 'none', true);
  select count(*) into n from public.perfis where id = a;
  select (cidadao_id is null and cidadao_nome = 'Conta excluída' and cidadao_telefone is null) into ok from public.solicitacoes where id = sol.id;
  r := r || format('[%s] conta excluída; solicitação mantida sem dados pessoais', case when n = 0 and ok then 'ok' else 'FALHOU' end) || E'\n';

  raise exception E'RESULTADO (tudo desfeito):\n%', r;
end $teste$;
