-- Teste: só admin publica conteúdo; visitante vê o que está ativo. Desfeito no final.
do $t$
declare r text := ''; ad uuid := gen_random_uuid(); c uuid := gen_random_uuid(); n int;
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data) values
    (ad, '00000000-0000-0000-0000-000000000000','authenticated','authenticated','ad@t.local','{"nome":"Admin","cpf":"390.533.447-05"}'),
    (c,  '00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@t.local','{"nome":"Cidadão","cpf":"529.982.247-25"}');
  update public.perfis set tipo='admin' where id=ad;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role','authenticated')::text, true);
  perform set_config('role','authenticated',true);
  begin insert into public.avisos (titulo, resumo) values ('x','y'); r := r||'[FALHOU] cidadão publicou aviso'||E'\n';
  exception when others then r := r||'[ok] cidadão não publica aviso'||E'\n'; end;
  perform set_config('role','none',true);
  perform set_config('request.jwt.claims', json_build_object('sub', ad, 'role','authenticated')::text, true);
  perform set_config('role','authenticated',true);
  insert into public.avisos (titulo, resumo, ativo) values ('Aviso teste','Resumo', false);
  select count(*) into n from public.avisos where titulo='Aviso teste';
  r := r||format('[%s] admin publica e vê aviso inativo', case when n=1 then 'ok' else 'FALHOU' end)||E'\n';
  update public.avisos set ativo = true where titulo='Aviso teste'; get diagnostics n = row_count;
  r := r||format('[%s] admin edita aviso', case when n=1 then 'ok' else 'FALHOU' end)||E'\n';
  perform set_config('role','none',true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role','anon',true);
  select jsonb_array_length(public.inicio()->'avisos') into n;
  r := r||format('[%s] visitante vê o aviso ativo na tela inicial (%s)', case when n=1 then 'ok' else 'FALHOU' end, n)||E'\n';
  perform set_config('role','none',true);
  raise exception E'RESULTADO (desfeito):\n%', r;
end $t$;
