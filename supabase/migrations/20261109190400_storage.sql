-- SAP Cidadão — arquivos.
-- "publico": imagens de banners, avisos, serviços, eventos (só admin envia; todos veem).
-- "solicitacoes": fotos das solicitações (privado; dono, secretaria e admin).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('publico', 'publico', true, 2097152, array['image/webp', 'image/jpeg', 'image/png']),
  ('solicitacoes', 'solicitacoes', false, 3145728, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy publico_admin_incluir on storage.objects for insert to authenticated
  with check (bucket_id = 'publico' and (select public.eh_admin()));
create policy publico_admin_alterar on storage.objects for update to authenticated
  using (bucket_id = 'publico' and (select public.eh_admin()));
create policy publico_admin_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'publico' and (select public.eh_admin()));

-- Caminho obrigatório: <id da solicitação>/<arquivo>
create or replace function public.storage_solicitacao_id(p_nome text)
returns uuid language plpgsql immutable set search_path = public as $$
begin
  return split_part(p_nome, '/', 1)::uuid;
exception when others then
  return null;
end $$;

create policy solicitacoes_ler on storage.objects for select to authenticated
  using (bucket_id = 'solicitacoes'
         and (select public.pode_ver_solicitacao(public.storage_solicitacao_id(name))));
create policy solicitacoes_incluir on storage.objects for insert to authenticated
  with check (bucket_id = 'solicitacoes'
              and (select public.pode_ver_solicitacao(public.storage_solicitacao_id(name)))
              and exists (select 1 from public.solicitacoes s
                           where s.id = public.storage_solicitacao_id(name)
                             and s.status not in ('concluida', 'indeferida', 'cancelada')));
create policy solicitacoes_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'solicitacoes'
         and (owner_id = (select auth.uid())::text or (select public.eh_admin())));
