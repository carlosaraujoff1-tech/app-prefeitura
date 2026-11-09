import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Campo, Cartao, Chip, ErroCarregar, Esqueleto, IconeCirculo, Vazio } from '@/components/ui';
import { Cores, Espaco, Fonte } from '@/constants/theme';
import { listarServicos } from '@/lib/api';

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Servicos() {
  const q = useQuery({ queryKey: ['servicos'], queryFn: listarServicos, staleTime: 10 * 60 * 1000 });
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState<string | null>(null);

  const categorias = useMemo(
    () => [...new Set((q.data ?? []).map((s) => s.categoria).filter(Boolean) as string[])],
    [q.data],
  );
  const lista = useMemo(() => {
    const termo = semAcento(busca.trim());
    return (q.data ?? []).filter(
      (s) =>
        (!categoria || s.categoria === categoria) &&
        (!termo || semAcento(`${s.nome} ${s.descricao ?? ''} ${s.categoria ?? ''}`).includes(termo)),
    );
  }, [q.data, busca, categoria]);

  if (q.isError && !q.data) return <ErroCarregar erro={q.error} tentarDeNovo={q.refetch} />;

  return (
    <FlatList
      data={lista}
      keyExtractor={(s) => s.id}
      contentContainerStyle={st.lista}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} colors={[Cores.primaria]} />}
      ListHeaderComponent={
        <View style={{ gap: Espaco.md, marginBottom: Espaco.sm }}>
          <Campo
            rotulo="Buscar serviço"
            icone="magnify"
            placeholder="Ex.: IPTU, certidão, consulta…"
            value={busca}
            onChangeText={setBusca}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {categorias.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Espaco.sm }}>
              <Chip texto="Todos" ativo={!categoria} onPress={() => setCategoria(null)} />
              {categorias.map((c) => (
                <Chip key={c} texto={c} ativo={categoria === c} onPress={() => setCategoria(categoria === c ? null : c)} />
              ))}
            </ScrollView>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        q.isPending ? (
          <View style={{ gap: Espaco.md }}>
            {[0, 1, 2, 3].map((i) => (
              <Esqueleto key={i} altura={84} />
            ))}
          </View>
        ) : (
          <Vazio icone="text-search" titulo="Nenhum serviço encontrado" texto="Tente outra palavra ou limpe o filtro." />
        )
      }
      renderItem={({ item }) => (
        <Cartao
          onPress={() => router.push({ pathname: '/servicos/[id]', params: { id: item.id } })}
          rotulo={item.nome}
          estilo={st.item}>
          <IconeCirculo nome={item.icone ?? 'file-document-outline'} tamanho={52} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.nome}>{item.nome}</Text>
            {item.descricao ? (
              <Text style={st.desc} numberOfLines={2}>
                {item.descricao}
              </Text>
            ) : null}
          </View>
          <Icone nome="chevron-right" cor={Cores.textoSecundario} />
        </Cartao>
      )}
    />
  );
}

const st = StyleSheet.create({
  lista: { padding: Espaco.lg, gap: Espaco.md, maxWidth: 760, width: '100%', alignSelf: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  nome: { fontSize: Fonte.media, fontWeight: '800', color: Cores.texto },
  desc: { fontSize: Fonte.pequena + 1, color: Cores.textoSecundario, lineHeight: 20 },
});
