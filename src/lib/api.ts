// Todas as leituras e ações do app no banco. Quem pode o quê é decidido NO BANCO (RLS).
import { supabase } from './supabase';

export type StatusSolicitacao = 'aberta' | 'em_analise' | 'em_execucao' | 'concluida' | 'indeferida' | 'cancelada';

export type Banner = {
  id: string; titulo: string; descricao: string | null; imagem_url: string | null;
  icone: string | null; cor: string | null; link: string | null;
};
export type Aviso = {
  id: string; titulo: string; resumo: string; conteudo?: string | null; imagem_url: string | null;
  link: string | null; fixado: boolean; publicado_em: string;
};
export type Noticia = {
  id: string; titulo: string; resumo: string | null; conteudo?: string; imagem_url: string | null; publicado_em: string;
};
export type CategoriaEvento = { id: string; nome: string; cor: string; icone: string };
export type Evento = {
  id: string; titulo: string; descricao?: string | null; imagem_url: string | null; local_nome: string | null;
  inicio_em: string; fim_em: string | null; categoria?: string | null; cor?: string | null; icone?: string | null;
};
export type Servico = {
  id: string; nome: string; descricao: string | null; categoria: string | null; imagem_url: string | null;
  icone: string | null; link_externo: string | null; tipo_solicitacao_id: string | null; destaque?: boolean;
};
export type Local = {
  id: string; nome: string; categoria: string; descricao: string | null; endereco: string | null;
  telefone: string | null; whatsapp: string | null; horario: string | null;
  latitude: number | null; longitude: number | null; telefone_util: boolean;
};
export type TipoSolicitacao = {
  id: string; nome: string; descricao: string | null; icone: string | null;
  exige_foto: boolean; exige_localizacao: boolean; prazo_dias: number | null;
};
export type Solicitacao = {
  id: string; protocolo: string; descricao: string; endereco: string | null; bairro: string | null;
  ponto_referencia: string | null; latitude: number | null; longitude: number | null;
  status: StatusSolicitacao; prazo_em: string | null; criado_em: string; atualizado_em: string;
  concluida_em: string | null; avaliacao_nota: number | null; avaliacao_comentario: string | null;
  tipo: { nome: string; icone: string | null } | null;
};
export type Historico = { id: number; status: StatusSolicitacao | null; mensagem: string | null; criado_em: string; autor_id: string | null };
export type Anexo = { id: string; caminho: string; url?: string };
export type Perfil = {
  id: string; nome: string; cpf: string; email: string | null; telefone: string | null; cep: string | null;
  logradouro: string | null; numero: string | null; complemento: string | null; bairro: string | null;
  cidade: string; uf: string; tipo: 'cidadao' | 'servidor' | 'admin';
};
export type Notificacao = { id: string; titulo: string; corpo: string; rota_destino: string | null; criado_em: string };
export type Lembrete = { id: string; evento_id: string; antecedencia_minutos: number; enviar_em: string };

export type DadosInicio = {
  banners: Banner[]; avisos: Aviso[]; eventos: Evento[]; noticias: Noticia[]; servicos_destaque: Servico[];
};

function ok<T>(r: { data: unknown; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

export async function buscarInicio() {
  return ok<DadosInicio>(await supabase.rpc('inicio'));
}

export async function listarServicos() {
  return ok<Servico[]>(
    await supabase.from('servicos')
      .select('id,nome,descricao,categoria,imagem_url,icone,link_externo,tipo_solicitacao_id,destaque')
      .eq('ativo', true).order('ordem').order('nome'),
  );
}

export async function listarAvisos() {
  return ok<Aviso[]>(
    await supabase.from('avisos').select('id,titulo,resumo,conteudo,imagem_url,link,fixado,publicado_em')
      .order('fixado', { ascending: false }).order('publicado_em', { ascending: false }).limit(50),
  );
}

export async function listarNoticias() {
  return ok<Noticia[]>(
    await supabase.from('noticias').select('id,titulo,resumo,conteudo,imagem_url,publicado_em')
      .order('publicado_em', { ascending: false }).limit(50),
  );
}

const SELECT_EVENTO = 'id,titulo,descricao,imagem_url,local_nome,inicio_em,fim_em,categoria:categorias_evento(nome,cor,icone)';
type EventoBruto = Omit<Evento, 'categoria' | 'cor' | 'icone'> & { categoria: { nome: string; cor: string; icone: string } | null };
const achatarEvento = (e: EventoBruto): Evento => ({
  ...e, categoria: e.categoria?.nome ?? null, cor: e.categoria?.cor ?? null, icone: e.categoria?.icone ?? null,
});

// Eventos de um mês (com uma semana de folga para os dias que aparecem do mês vizinho).
export async function listarEventosMes(ano: number, mes: number) {
  const inicio = new Date(Date.UTC(ano, mes, 1, 3) - 7 * 86400000).toISOString();
  const fim = new Date(Date.UTC(ano, mes + 1, 1, 3) + 7 * 86400000).toISOString();
  const dados = ok<EventoBruto[]>(
    await supabase.from('eventos').select(SELECT_EVENTO).gte('inicio_em', inicio).lt('inicio_em', fim).order('inicio_em'),
  );
  return dados.map(achatarEvento);
}

export async function buscarEvento(id: string) {
  return achatarEvento(ok<EventoBruto>(await supabase.from('eventos').select(SELECT_EVENTO).eq('id', id).single()));
}

export async function listarLocais() {
  return ok<Local[]>(
    await supabase.from('locais')
      .select('id,nome,categoria,descricao,endereco,telefone,whatsapp,horario,latitude,longitude,telefone_util')
      .order('ordem').order('nome'),
  );
}

export async function listarTipos() {
  return ok<TipoSolicitacao[]>(
    await supabase.from('tipos_solicitacao').select('id,nome,descricao,icone,exige_foto,exige_localizacao,prazo_dias')
      .eq('ativo', true).order('ordem').order('nome'),
  );
}

export async function listarBairros() {
  return ok<{ id: string; nome: string }[]>(await supabase.from('bairros').select('id,nome').order('ordem').order('nome'));
}

const SELECT_SOLICITACAO =
  'id,protocolo,descricao,endereco,bairro,ponto_referencia,latitude,longitude,status,prazo_em,criado_em,atualizado_em,concluida_em,avaliacao_nota,avaliacao_comentario,tipo:tipos_solicitacao(nome,icone)';

export async function minhasSolicitacoes(usuarioId: string) {
  return ok<Solicitacao[]>(
    await supabase.from('solicitacoes').select(SELECT_SOLICITACAO).eq('cidadao_id', usuarioId)
      .order('criado_em', { ascending: false }).limit(100),
  );
}

export async function buscarSolicitacao(id: string) {
  const [sol, hist, anexos] = await Promise.all([
    supabase.from('solicitacoes').select(SELECT_SOLICITACAO).eq('id', id).single(),
    supabase.from('solicitacao_historico').select('id,status,mensagem,criado_em,autor_id').eq('solicitacao_id', id).order('criado_em'),
    supabase.from('solicitacao_anexos').select('id,caminho').eq('solicitacao_id', id).order('criado_em'),
  ]);
  const lista = ok<Anexo[]>(anexos);
  let fotos: Anexo[] = lista;
  if (lista.length) {
    const { data } = await supabase.storage.from('solicitacoes').createSignedUrls(lista.map((a) => a.caminho), 3600);
    fotos = lista.map((a, i) => ({ ...a, url: data?.[i]?.signedUrl ?? undefined }));
  }
  return { solicitacao: ok<Solicitacao>(sol), historico: ok<Historico[]>(hist), fotos };
}

export async function abrirSolicitacao(p: {
  tipo_id: string; descricao: string; endereco?: string; bairro?: string; ponto_referencia?: string;
  latitude?: number | null; longitude?: number | null;
}) {
  return ok<Solicitacao>(
    await supabase.rpc('abrir_solicitacao', {
      p_tipo_id: p.tipo_id,
      p_descricao: p.descricao,
      p_endereco: p.endereco || null,
      p_bairro: p.bairro || null,
      p_ponto_referencia: p.ponto_referencia || null,
      p_latitude: p.latitude ?? null,
      p_longitude: p.longitude ?? null,
    }),
  );
}

export async function cancelarSolicitacao(id: string) {
  ok(await supabase.rpc('cancelar_solicitacao', { p_id: id }));
}

export async function avaliarSolicitacao(id: string, nota: number, comentario?: string) {
  ok(await supabase.rpc('avaliar_solicitacao', { p_id: id, p_nota: nota, p_comentario: comentario || null }));
}

export async function meusLembretes() {
  return ok<Lembrete[]>(await supabase.from('lembretes_evento').select('id,evento_id,antecedencia_minutos,enviar_em'));
}

export async function definirLembrete(eventoId: string, minutos: number) {
  ok(await supabase.rpc('definir_lembrete', { p_evento_id: eventoId, p_antecedencia_minutos: minutos }));
}

export async function removerLembrete(eventoId: string) {
  ok(await supabase.from('lembretes_evento').delete().eq('evento_id', eventoId));
}

export async function listarNotificacoes() {
  return ok<Notificacao[]>(
    await supabase.from('notificacoes').select('id,titulo,corpo,rota_destino,criado_em')
      .order('criado_em', { ascending: false }).limit(50),
  );
}

export async function naoLidas() {
  return ok<number>(await supabase.rpc('notificacoes_nao_lidas'));
}

export async function marcarLidas() {
  ok(await supabase.rpc('marcar_notificacoes_lidas'));
}

export async function buscarPerfil(id: string) {
  return ok<Perfil>(
    await supabase.from('perfis')
      .select('id,nome,cpf,email,telefone,cep,logradouro,numero,complemento,bairro,cidade,uf,tipo').eq('id', id).single(),
  );
}

export async function salvarPerfil(id: string, dados: Partial<Perfil>) {
  ok(await supabase.from('perfis').update(dados).eq('id', id));
}

export async function excluirConta() {
  ok(await supabase.rpc('excluir_minha_conta'));
}

export function urlPublica(caminho: string | null | undefined) {
  if (!caminho) return null;
  if (/^https?:\/\//.test(caminho)) return caminho;
  return supabase.storage.from('publico').getPublicUrl(caminho).data.publicUrl;
}
