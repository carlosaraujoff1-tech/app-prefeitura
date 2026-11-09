import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { supabase } from './supabase';

// Escolhe/tira uma foto e já reduz para no máximo 1280 px em WebP (fica ~150 KB).
export async function escolherFoto(origem: 'camera' | 'galeria'): Promise<string | null> {
  if (origem === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
  const r =
    origem === 'camera'
      ? await ImagePicker.launchCameraAsync(opcoes)
      : await ImagePicker.launchImageLibraryAsync(opcoes);
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  const maior = Math.max(a.width ?? 0, a.height ?? 0);
  const ctx = ImageManipulator.manipulate(a.uri);
  if (maior > 1280) {
    if ((a.width ?? 0) >= (a.height ?? 0)) ctx.resize({ width: 1280, height: null });
    else ctx.resize({ width: null, height: 1280 });
  }
  const img = await ctx.renderAsync();
  const salvo = await img.saveAsync({ format: SaveFormat.WEBP, compress: 0.7 });
  return salvo.uri;
}

export async function enviarFotoSolicitacao(solicitacaoId: string, uri: string, usuarioId: string) {
  const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const caminho = `${solicitacaoId}/${nome}`;
  const dados =
    Platform.OS === 'web' ? await (await fetch(uri)).arrayBuffer() : await new File(uri).arrayBuffer();
  const { error } = await supabase.storage.from('solicitacoes').upload(caminho, dados, {
    contentType: 'image/webp',
    upsert: false,
  });
  if (error) throw error;
  const r = await supabase.from('solicitacao_anexos').insert({ solicitacao_id: solicitacaoId, caminho, autor_id: usuarioId });
  if (r.error) throw r.error;
}
