-- SAP Cidadão — primeiro administrador.
-- Quando a conta com o CPF guardado em privado.config('admin_inicial_cpf') for criada,
-- ela vira administrador automaticamente e a configuração é apagada (vale uma vez só).

create or replace function privado.tg_admin_inicial()
returns trigger language plpgsql security definer set search_path = public, privado as $$
begin
  if new.cpf = privado.cfg('admin_inicial_cpf') then
    update public.perfis set tipo = 'admin' where id = new.id;
    delete from privado.config where chave = 'admin_inicial_cpf';
  end if;
  return null;
end $$;
revoke execute on function privado.tg_admin_inicial() from public, anon, authenticated;

create trigger perfis_admin_inicial after insert on public.perfis
  for each row execute function privado.tg_admin_inicial();

-- CPF do responsável técnico (Carlos), informado em 10/11/2026.
insert into privado.config (chave, valor) values ('admin_inicial_cpf', '11382335954')
on conflict (chave) do update set valor = excluded.valor;
