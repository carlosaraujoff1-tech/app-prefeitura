import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Carregando, Cartao, ErroCarregar, Esqueleto, IconeCirculo, Vazio } from '@/components/ui';
import { Cores, Espaco, Fonte } from '@/constants/theme';
import { listarNotificacoes, marcarLidas } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { quando } from '@/lib/formatar';

export default function Notificacoes() {
  const { usuarioId, carregando } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['notificacoes', usuarioId], queryFn: listarNotificacoes, enabled: !!usuarioId });

  useEffect(() => {
    if (!usuarioId) return;
    marcarLidas()
      .then(() => qc.setQueryData(['nao-lidas', usuarioId], 0))
      .catch(() => {});
  }, [usuarioId, qc]);

  if (carregando) return <Carregando />;
  if (!usuarioId) return <Redirect href="/entrar" />;
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
            <Esqueleto altura={84} />
            <Esqueleto altura={84} />
          </View>
        ) : (
          <Vazio
            icone="bell-check-outline"
            titulo="Tudo em dia"
            texto="Aqui aparecem os avisos sobre suas solicitações, lembretes de eventos e comunicados."
          />
        )
      }
      renderItem={({ item }) => (
        <Cartao
          onPress={item.rota_destino ? () => router.push(item.rota_destino as Href) : undefined}
          rotulo={`${item.titulo}. ${item.corpo}`}
          estilo={st.item}>
          <IconeCirculo nome="bell-outline" tamanho={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.titulo}>{item.titulo}</Text>
            <Text style={st.corpo}>{item.corpo}</Text>
            <Text style={st.data}>{quando(item.criado_em)}</Text>
          </View>
          {item.rota_destino ? <Icone nome="chevron-right" cor={Cores.textoSecundario} /> : null}
        </Cartao>
      )}
    />
  );
}

const st = StyleSheet.create({
  lista: { padding: Espaco.lg, gap: Espaco.md, maxWidth: 760, width: '100%', alignSelf: 'center' },
  item: { flexDirection: 'row', gap: Espaco.md, alignItems: 'flex-start' },
  titulo: { fontSize: Fonte.normal + 1, fontWeight: '800', color: Cores.texto },
  corpo: { fontSize: Fonte.normal - 1, color: Cores.texto, lineHeight: 21 },
  data: { fontSize: Fonte.pequena, color: Cores.textoSecundario },
});
