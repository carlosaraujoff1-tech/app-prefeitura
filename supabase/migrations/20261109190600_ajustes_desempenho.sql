-- SAP Cidadão — ajustes apontados pelo analisador do Supabase (desempenho).
-- 1) Índices nas chaves estrangeiras que faltavam.
-- 2) Uma única política de leitura por tabela (antes: "ler" + "admin para tudo" = 2 checagens por linha).

create index avisos_criado_por_idx on public.avisos (criado_por);
create index eventos_local_idx on public.eventos (local_id);
create index servicos_tipo_solicitacao_idx on public.servicos (tipo_solicitacao_id);
create index tipos_solicitacao_secretaria_idx on public.tipos_solicitacao (secretaria_id);

do $$
declare
  t text;
begin
  foreach t in array array['secretarias', 'banners', 'avisos', 'tipos_solicitacao', 'servicos', 'locais', 'eventos'] loop
    execute format('drop policy %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.eh_admin()))', t || '_admin_incluir', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.eh_admin())) with check ((select public.eh_admin()))', t || '_admin_alterar', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.eh_admin()))', t || '_admin_apagar', t);
  end loop;
end $$;
