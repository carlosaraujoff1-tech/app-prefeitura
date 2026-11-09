-- SAP Cidadão — quem pode chamar cada função.
-- Regra: tudo fechado por padrão; libera uma a uma.

revoke execute on all functions in schema public from public, anon, authenticated;
revoke execute on all functions in schema privado from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

-- Usadas pela RLS (precisam ser chamáveis por quem consulta)
grant execute on function public.eh_admin()                     to anon, authenticated;
grant execute on function public.eh_equipe()                    to anon, authenticated;
grant execute on function public.minha_secretaria()             to authenticated;
grant execute on function public.pode_ver_solicitacao(uuid)     to authenticated;
grant execute on function public.pode_atender_solicitacao(uuid) to authenticated;
grant execute on function public.storage_solicitacao_id(text)   to authenticated;
grant execute on function public.so_digitos(text)               to anon, authenticated;
grant execute on function public.cpf_valido(text)               to anon, authenticated;
grant execute on function public.status_rotulo(public.status_solicitacao) to anon, authenticated;

-- Ações do app
grant execute on function public.inicio()                       to anon, authenticated;
grant execute on function public.abrir_solicitacao(uuid, text, text, text, text, double precision, double precision) to authenticated;
grant execute on function public.cancelar_solicitacao(uuid, text)          to authenticated;
grant execute on function public.avaliar_solicitacao(uuid, integer, text)  to authenticated;
grant execute on function public.definir_lembrete(uuid, integer)           to authenticated;
grant execute on function public.registrar_acesso()                        to authenticated;
grant execute on function public.excluir_minha_conta()                     to authenticated;
grant execute on function public.registrar_dispositivo(text, text)         to authenticated;
grant execute on function public.remover_dispositivo(text)                 to authenticated;
grant execute on function public.notificacoes_nao_lidas()                  to authenticated;
grant execute on function public.marcar_notificacoes_lidas()               to authenticated;

-- Ações da equipe (a função confere se é servidor da secretaria ou admin)
grant execute on function public.atualizar_solicitacao(uuid, public.status_solicitacao, text, boolean) to authenticated;
grant execute on function public.transferir_solicitacao(uuid, uuid, text) to authenticated;

-- Só a Edge Function (chave de serviço)
grant execute on function public.reservar_fila_push(integer)   to service_role;
grant execute on function public.push_segredo_confere(text)    to service_role;

-- Tabelas internas: nada para anon/authenticated
revoke all on public.fila_push from anon, authenticated;
revoke all on public.eventos_push from anon;
revoke all on public.solicitacoes, public.solicitacao_historico, public.solicitacao_anexos,
              public.lembretes_evento, public.dispositivos_push, public.notificacoes, public.perfis
  from anon;
-- Gravação direta em solicitações/histórico é proibida mesmo com RLS (só por função).
revoke insert, update, delete on public.solicitacoes, public.solicitacao_historico from authenticated;
revoke insert, update on public.lembretes_evento from authenticated;
revoke insert, delete on public.perfis from authenticated;
