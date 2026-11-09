import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Carregando, Etiqueta, tx } from '@/components/ui';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { listarNoticias, urlPublica } from '@/lib/api';
import { dataExtenso } from '@/lib/formatar';

export default function NoticiaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['noticias'], queryFn: listarNoticias });
  const a = q.data?.find((x) => x.id === id);
  if (!a) return <Carregando />;
  const img = urlPublica(a.imagem_url);
  return (
    <ScrollView contentContainerStyle={st.tela}>
      {img ? <Image source={{ uri: img }} style={st.img} contentFit="cover" accessibilityLabel={a.titulo} /> : null}
      <Etiqueta texto="Notícia" icone="newspaper-variant-outline" cor={Cores.primaria} fundo={Cores.primariaClara} />
      <Text style={tx.titulo}>{a.titulo}</Text>
      <Text style={tx.secundario}>Publicado em {dataExtenso(a.publicado_em)}</Text>
      <Text style={tx.corpo}>{a.conteudo || a.resumo || ''}</Text>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.xl, gap: Espaco.md, maxWidth: 760, width: '100%', alignSelf: 'center' },
  img: { width: '100%', aspectRatio: 16 / 9, borderRadius: Raio.lg, backgroundColor: '#DDE3EA' },
});
