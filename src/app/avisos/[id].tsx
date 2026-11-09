import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Botao, Carregando, Etiqueta, tx } from '@/components/ui';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { abrirLink } from '@/lib/abrir';
import { listarAvisos, urlPublica } from '@/lib/api';
import { dataExtenso } from '@/lib/formatar';

export default function AvisoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['avisos'], queryFn: listarAvisos });
  const a = q.data?.find((x) => x.id === id);
  if (!a) return <Carregando />;
  const img = urlPublica(a.imagem_url);
  return (
    <ScrollView contentContainerStyle={st.tela}>
      {img ? <Image source={{ uri: img }} style={st.img} contentFit="cover" accessibilityLabel={a.titulo} /> : null}
      <Etiqueta texto="Aviso da Prefeitura" icone="bullhorn-outline" cor={Cores.primaria} fundo={Cores.primariaClara} />
      <Text style={tx.titulo}>{a.titulo}</Text>
      <Text style={tx.secundario}>Publicado em {dataExtenso(a.publicado_em)}</Text>
      <Text style={tx.corpo}>{a.conteudo || a.resumo}</Text>
      {a.link ? <Botao titulo="Saiba mais" icone="open-in-new" variante="contorno" onPress={() => abrirLink(a.link)} /> : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.xl, gap: Espaco.md, maxWidth: 760, width: '100%', alignSelf: 'center' },
  img: { width: '100%', aspectRatio: 16 / 9, borderRadius: Raio.lg, backgroundColor: '#DDE3EA' },
});
