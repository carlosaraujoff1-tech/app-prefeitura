import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

export type Coordenadas = { lat: number; lng: number };

// A localização fica só no celular (usada para calcular distância / marcar o local do problema).
export async function pegarLocalizacao(): Promise<Coordenadas | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const ultima = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 });
  if (ultima) return { lat: ultima.coords.latitude, lng: ultima.coords.longitude };
  const atual = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: atual.coords.latitude, lng: atual.coords.longitude };
}

export function useLocalizacao() {
  const [coords, setCoords] = useState<Coordenadas | null>(null);
  const [estado, setEstado] = useState<'inicial' | 'buscando' | 'ok' | 'negado' | 'erro'>('inicial');

  const buscar = useCallback(async () => {
    setEstado('buscando');
    try {
      const c = await pegarLocalizacao();
      if (!c) {
        setEstado('negado');
        return null;
      }
      setCoords(c);
      setEstado('ok');
      return c;
    } catch {
      setEstado('erro');
      return null;
    }
  }, []);

  return { coords, estado, buscar };
}

// Endereço aproximado a partir do GPS (usa o serviço do próprio celular).
export async function enderecoDoPonto(c: Coordenadas) {
  try {
    const [r] = await Location.reverseGeocodeAsync({ latitude: c.lat, longitude: c.lng });
    if (!r) return null;
    const rua = [r.street, r.streetNumber].filter(Boolean).join(', ');
    return { endereco: rua || r.name || '', bairro: r.district ?? r.subregion ?? '' };
  } catch {
    return null;
  }
}
