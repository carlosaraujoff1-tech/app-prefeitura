import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform } from 'react-native';

import { soDigitos } from './formatar';

// Link de banner/aviso/notificação: rota do app ("/agenda") ou site ("https://...").
export function abrirLink(link: string | null | undefined) {
  if (!link) return;
  if (link.startsWith('/')) {
    router.push(link as Href);
    return;
  }
  abrirSite(link);
}

export async function abrirSite(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url, { toolbarColor: '#0B4A8F', controlsColor: '#FFFFFF' });
  } catch {
    Linking.openURL(url);
  }
}

export function ligar(telefone: string) {
  const numero = soDigitos(telefone);
  Linking.openURL(`tel:${numero}`).catch(() => Alert.alert('Não foi possível ligar', `Disque ${telefone}`));
}

export function whatsapp(numero: string) {
  let d = soDigitos(numero);
  if (d.length <= 11) d = `55${d}`;
  Linking.openURL(`https://wa.me/${d}`);
}

// Abre o app de mapas do celular com a rota até o local.
export function comoChegar(lat: number | null, lng: number | null, endereco?: string | null) {
  const destino =
    lat != null && lng != null
      ? `${lat},${lng}`
      : encodeURIComponent(`${endereco ?? ''}, Santo Antônio da Platina - PR`);
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${destino}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
  Linking.openURL(url);
}
