import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Cartao, ErroCarregar, Esqueleto, Vazio } from '@/components/ui';
import { Cores, Espaco, Fonte, Raio } from '@/constants/theme';
import { listarAvisos } from '@/lib/api';
import { MESES_CURTOS, partesBR } from '@/lib/formatar';

export default function Avisos() {
  const q = useQuery({ queryKey: ['avisos'], queryFn: listarAvisos });
  if (q.isError && !q.data) return <ErroCarregar erro={q.error} tentarDeNovo={q.refetch} />;
  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(a) => a.id}
      contentContainerStyle={st.lista}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} colors={[Cores.primaria]} />}
      ListEmptyComponent={
        q.isPending ? (
          <View style={{ gap: Espaco.md }}>
            <Esqueleto altura={96} />
            <Esqueleto altura={96} />
          </View>
        ) : (
          <Vazio icone="bullhorn-outline" titulo="Nenhum aviso no momento" />
        )
      }
      renderItem={({ item }) => {
        const p = partesBR(item.publicado_em);
        return (
          <Cartao
            onPress={() => router.push({ pathname: '/avisos/[id]', params: { id: item.id } })}
            rotulo={item.titulo}
            estilo={st.item}>
            <View style={st.data}>
              <Text style={st.dia}>{p.dia}</Text>
              <Text style={st.mes}>{MESES_CURTOS[p.mes]}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={st.titulo}>
                {item.fixado ? '📌 ' : ''}
                {item.titulo}
              </Text>
              <Text style={st.resumo} numberOfLines={3}>
                {item.resumo}
              </Text>
            </View>
          </Cartao>
        );
      }}
    />
  );
}

const st = StyleSheet.create({
  lista: { padding: Espaco.lg, gap: Espaco.md, maxWidth: 760, width: '100%', alignSelf: 'center' },
  item: { flexDirection: 'row', gap: Espaco.md, alignItems: 'flex-start' },
  data: { width: 56, height: 60, borderRadius: Raio.md, backgroundColor: Cores.primariaClara, alignItems: 'center', justifyContent: 'center' },
  dia: { fontSize: Fonte.grande, fontWeight: '900', color: Cores.primaria, lineHeight: 24 },
  mes: { fontSize: Fonte.pequena - 1, fontWeight: '800', color: Cores.primaria, textTransform: 'uppercase' },
  titulo: { fontSize: Fonte.media - 1, fontWeight: '800', color: Cores.texto },
  resumo: { fontSize: Fonte.normal - 1, color: Cores.textoSecundario, lineHeight: 21 },
});
