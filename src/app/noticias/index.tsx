import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Cartao, ErroCarregar, Esqueleto, IconeCirculo, Vazio } from '@/components/ui';
import { Cores, Espaco, Fonte, Raio } from '@/constants/theme';
import { listarNoticias, urlPublica } from '@/lib/api';
import { quando } from '@/lib/formatar';

export default function Noticias() {
  const q = useQuery({ queryKey: ['noticias'], queryFn: listarNoticias });
  if (q.isError && !q.data) return <ErroCarregar erro={q.error} tentarDeNovo={q.refetch} />;
  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(n) => n.id}
      contentContainerStyle={st.lista}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} colors={[Cores.primaria]} />}
      ListEmptyComponent={
        q.isPending ? (
          <View style={{ gap: Espaco.md }}>
            <Esqueleto altura={110} />
            <Esqueleto altura={110} />
          </View>
        ) : (
          <Vazio icone="newspaper-variant-outline" titulo="Nenhuma notícia por enquanto" />
        )
      }
      renderItem={({ item }) => {
        const img = urlPublica(item.imagem_url);
        return (
          <Cartao
            onPress={() => router.push({ pathname: '/noticias/[id]', params: { id: item.id } })}
            rotulo={item.titulo}
            estilo={{ gap: Espaco.md }}>
            {img ? <Image source={{ uri: img }} style={st.img} contentFit="cover" accessibilityLabel="" /> : null}
            <View style={st.linha}>
              {!img ? <IconeCirculo nome="newspaper-variant-outline" tamanho={46} /> : null}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={st.titulo}>{item.titulo}</Text>
                {item.resumo ? (
                  <Text style={st.resumo} numberOfLines={2}>
                    {item.resumo}
                  </Text>
                ) : null}
                <Text style={st.data}>{quando(item.publicado_em)}</Text>
              </View>
            </View>
          </Cartao>
        );
      }}
    />
  );
}

const st = StyleSheet.create({
  lista: { padding: Espaco.lg, gap: Espaco.md, maxWidth: 760, width: '100%', alignSelf: 'center' },
  linha: { flexDirection: 'row', gap: Espaco.md, alignItems: 'flex-start' },
  img: { width: '100%', aspectRatio: 16 / 9, borderRadius: Raio.md, backgroundColor: '#DDE3EA' },
  titulo: { fontSize: Fonte.media - 1, fontWeight: '800', color: Cores.texto },
  resumo: { fontSize: Fonte.normal - 1, color: Cores.textoSecundario, lineHeight: 21 },
  data: { fontSize: Fonte.pequena, color: Cores.textoSecundario, fontWeight: '600' },
});
