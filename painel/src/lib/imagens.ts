import { supabase } from './supabase';

export type PastaImagem = 'banners' | 'avisos' | 'noticias' | 'eventos' | 'servicos';

// Reduz a foto (lado maior até `ladoMax`) e converte para WebP antes de subir:
// uma foto de 4 MB vira ~150 KB e o app do cidadão carrega rápido.
export async function comprimirImagem(arquivo: Blob, ladoMax = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Navegador sem suporte a imagem');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.85));
  if (!blob) throw new Error('Não foi possível converter a imagem');
  return blob;
}

// Sobe para o bucket público "publico" (só admin escreve) e devolve a URL.
export async function enviarImagem(arquivo: Blob, pasta: PastaImagem, ladoMax = 1600): Promise<string> {
  const blob = await comprimirImagem(arquivo, ladoMax);
  const caminho = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const { error } = await supabase.storage
    .from('publico')
    .upload(caminho, blob, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return supabase.storage.from('publico').getPublicUrl(caminho).data.publicUrl;
}

// Foto de solicitação (bucket privado): equipe anexando "serviço feito".
export async function enviarFotoSolicitacao(solicitacaoId: string, arquivo: File, autorId: string) {
  const blob = await comprimirImagem(arquivo, 1280);
  const caminho = `${solicitacaoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const up = await supabase.storage.from('solicitacoes').upload(caminho, blob, { contentType: 'image/webp' });
  if (up.error) throw up.error;
  const r = await supabase.from('solicitacao_anexos').insert({ solicitacao_id: solicitacaoId, caminho, autor_id: autorId });
  if (r.error) throw r.error;
}
