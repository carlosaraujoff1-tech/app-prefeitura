-- SAP Cidadão — apoio ao login por CPF (usado só pelas Edge Functions "entrar" e "recuperar-senha").
-- Nenhuma destas funções pode ser chamada pelo app: só pela chave de serviço.

create or replace function public.login_email_por_cpf(p_cpf text)
returns text language sql stable security definer set search_path = public as $$
  select p.email from public.perfis p
   where p.cpf = public.so_digitos(p_cpf) and p.ativo;
$$;

-- true = bloqueado (muitas falhas recentes para este CPF ou este IP)
create or replace function public.login_bloqueado(p_chave_cpf text, p_chave_ip text)
returns boolean language sql stable security definer set search_path = public, privado as $$
  select (select count(*) from privado.tentativas_login
           where chave = p_chave_cpf and not sucesso and criado_em > now() - interval '15 minutes') >= 5
      or (select count(*) from privado.tentativas_login
           where chave = p_chave_ip and not sucesso and criado_em > now() - interval '15 minutes') >= 30;
$$;

create or replace function public.login_registrar(p_chave_cpf text, p_chave_ip text, p_sucesso boolean)
returns void language sql security definer set search_path = public, privado as $$
  insert into privado.tentativas_login (chave, sucesso)
  select c, p_sucesso from unnest(array[p_chave_cpf, p_chave_ip]) c where c is not null;
$$;

revoke execute on function public.login_email_por_cpf(text) from public, anon, authenticated;
revoke execute on function public.login_bloqueado(text, text) from public, anon, authenticated;
revoke execute on function public.login_registrar(text, text, boolean) from public, anon, authenticated;
grant execute on function public.login_email_por_cpf(text) to service_role;
grant execute on function public.login_bloqueado(text, text) to service_role;
grant execute on function public.login_registrar(text, text, boolean) to service_role;
