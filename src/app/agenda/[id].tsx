import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/icone';
import { BotaoLembrete } from '@/components/lembrete';
import { Botao, Cartao, Carregando, ErroCarregar, IconeCirculo, tx } from '@/components/ui';
import { Cores, Espaco, Fonte, Raio } from '@/constants/theme';
import { comoChegar } from '@/lib/abrir';
import { buscarEvento, urlPublica } from '@/lib/api';
import { useAgora } from '@/lib/agora';
import { dataExtenso, hora } from '@/lib/formatar';

export default function EventoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const q = useQuery({ queryKey: ['evento', id], queryFn: () => buscarEvento(id) });
  const agora = useAgora();
  if (q.isPending) return <Carregando />;
  if (q.isError) return <ErroCarregar erro={q.error} tentarDeNovo={q.refetch} />;
  const e = q.data;
  const cor = e.cor ?? Cores.primaria;
  const img = urlPublica(e.imagem_url);
  const passou = new Date(e.fim_em ?? e.inicio_em).getTime() < agora;

  return (
    <ScrollView contentContainerStyle={st.tela}>
      <Stack.Screen options={{ title: e.categoria ?? 'Evento' }} />
      {img ? (
        <Image source={{ uri: img }} style={st.imagem} contentFit="cover" accessibilityLabel={e.titulo} />
      ) : (
        <View style={[st.capa, { backgroundColor: cor }]}>
          <Icone nome={e.icone ?? 'calendar-star'} cor="rgba(255,255,255,0.9)" tamanho={64} />
        </View>
      )}
      {e.categoria ? <Text style={[st.categoria, { color: cor }]}>{e.categoria}</Text> : null}
      <Text style={tx.titulo}>{e.titulo}</Text>

      <Cartao estilo={{ gap: Espaco.md }}>
        <Linha icone="calendar" texto={dataExtenso(e.inicio_em)} />
        <Linha icone="clock-outline" texto={`${hora(e.inicio_em)}${e.fim_em ? ` às ${hora(e.fim_em)}` : ''}`} />
        {e.local_nome ? <Linha icone="map-marker-outline" texto={e.local_nome} /> : null}
      </Cartao>

      {e.descricao ? <Text style={tx.corpo}>{e.descricao}</Text> : null}

      {passou ? (
        <View style={st.passou}>
          <IconeCirculo nome="calendar-check" cor={Cores.textoSecundario} tamanho={36} />
          <Text style={tx.secundario}>Este evento já aconteceu.</Text>
        </View>
      ) : (
        <BotaoLembrete evento={e} grande />
      )}
      {e.local_nome ? (
        <Botao titulo="Como chegar" icone="directions" variante="contorno" onPress={() => comoChegar(null, null, e.local_nome)} />
      ) : null}
    </ScrollView>
  );
}

function Linha({ icone, texto }: { icone: 'calendar' | 'clock-outline' | 'map-marker-outline'; texto: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Espaco.md }}>
      <Icone nome={icone} cor={Cores.primaria} tamanho={24} />
      <Text style={[tx.corpo, { flex: 1 }]}>{texto}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.lg, gap: Espaco.md, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  imagem: { width: '100%', aspectRatio: 16 / 9, borderRadius: Raio.xl, backgroundColor: '#DDE3EA' },
  capa: { height: 150, borderRadius: Raio.xl, alignItems: 'center', justifyContent: 'center' },
  categoria: { fontSize: Fonte.pequena, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: Espaco.sm },
  passou: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
});
