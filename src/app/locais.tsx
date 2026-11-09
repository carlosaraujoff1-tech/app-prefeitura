import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Botao, Caixa, Cartao, Chip, ErroCarregar, Esqueleto, IconeCirculo } from '@/components/ui';
import { Cores, Espaco, Fonte } from '@/constants/theme';
import { comoChegar, ligar } from '@/lib/abrir';
import { listarLocais } from '@/lib/api';
import { CATEGORIAS_LOCAL } from '@/lib/categorias';
import { distanciaKm, textoDistancia } from '@/lib/formatar';
import { useLocalizacao } from '@/lib/localizacao';


export default function Locais() {
  const q = useQuery({ queryKey: ['locais'], queryFn: listarLocais, staleTime: 30 * 60 * 1000 });
  const gps = useLocalizacao();
  const [filtro, setFiltro] = useState<string | null>(null);
  const { buscar } = gps;

  useEffect(() => {
    buscar();
  }, [buscar]);

  // Só locais com endereço (os números de emergência ficam em "Telefones úteis").
  const comEndereco = useMemo(() => (q.data ?? []).filter((l) => l.latitude != null || l.endereco), [q.data]);
  const categorias = useMemo(() => [...new Set(comEndereco.map((l) => l.categoria))], [comEndereco]);
  const lista = useMemo(() => {
    const base = comEndereco
      .filter((l) => !filtro || l.categoria === filtro)
      .map((l) => ({
        ...l,
        km:
          gps.coords && l.latitude != null && l.longitude != null
            ? distanciaKm(gps.coords, { lat: l.latitude, lng: l.longitude })
            : null,
      }));
    return gps.coords ? base.sort((a, b) => (a.km ?? 999) - (b.km ?? 999)) : base;
  }, [comEndereco, filtro, gps.coords]);

  if (q.isError && !q.data) return <ErroCarregar erro={q.error} tentarDeNovo={q.refetch} />;

  return (
    <FlatList
      data={lista}
      keyExtractor={(l) => l.id}
      contentContainerStyle={st.lista}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} colors={[Cores.primaria]} />}
      ListHeaderComponent={
        <View style={{ gap: Espaco.md, marginBottom: Espaco.sm }}>
          {gps.estado === 'negado' ? (
            <Caixa
              tipo="info"
              texto="Para ver a distância até cada local, autorize a localização. Sua posição não é enviada para a Prefeitura."
            />
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Espaco.sm }}>
            <Chip texto="Todos" ativo={!filtro} onPress={() => setFiltro(null)} />
            {categorias.map((c) => (
              <Chip
                key={c}
                texto={CATEGORIAS_LOCAL[c]?.nome ?? c}
                icone={CATEGORIAS_LOCAL[c]?.icone}
                ativo={filtro === c}
                onPress={() => setFiltro(filtro === c ? null : c)}
              />
            ))}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        q.isPending ? (
          <View style={{ gap: Espaco.md }}>
            <Esqueleto altura={150} />
            <Esqueleto altura={150} />
          </View>
        ) : undefined
      }
      renderItem={({ item }) => {
        const cat = CATEGORIAS_LOCAL[item.categoria] ?? CATEGORIAS_LOCAL.outros;
        return (
          <Cartao estilo={{ gap: Espaco.md }}>
            <View style={st.linha}>
              <IconeCirculo nome={cat.icone} cor={cat.cor} tamanho={52} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.nome}>{item.nome}</Text>
                <Text style={[st.cat, { color: cat.cor }]}>{cat.nome}</Text>
              </View>
            </View>
            {item.descricao ? <Text style={st.info}>{item.descricao}</Text> : null}
            {item.endereco ? (
              <View style={st.meta}>
                <Icone nome="map-marker-outline" cor={Cores.textoSecundario} tamanho={18} />
                <Text style={st.info}>{item.endereco}</Text>
              </View>
            ) : null}
            {item.km != null ? (
              <View style={st.meta}>
                <Icone nome="walk" cor={Cores.primaria} tamanho={18} />
                <Text style={[st.info, { color: Cores.primaria, fontWeight: '800' }]}>{textoDistancia(item.km)}</Text>
              </View>
            ) : null}
            {item.horario ? (
              <View style={st.meta}>
                <Icone nome="clock-outline" cor={Cores.textoSecundario} tamanho={18} />
                <Text style={st.info}>{item.horario}</Text>
              </View>
            ) : null}
            <View style={st.botoes}>
              {item.telefone ? (
                <Botao titulo="Ligar" icone="phone" onPress={() => ligar(item.telefone!)} estilo={{ flex: 1 }} compacto />
              ) : null}
              <Botao
                titulo="Como chegar"
                icone="directions"
                variante={item.telefone ? 'contorno' : 'primario'}
                onPress={() => comoChegar(item.latitude, item.longitude, item.endereco)}
                estilo={{ flex: 1 }}
                compacto
              />
            </View>
          </Cartao>
        );
      }}
    />
  );
}

const st = StyleSheet.create({
  lista: { padding: Espaco.lg, gap: Espaco.md, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  nome: { fontSize: Fonte.media, fontWeight: '800', color: Cores.texto },
  cat: { fontSize: Fonte.pequena, fontWeight: '800' },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  info: { fontSize: Fonte.normal - 1, color: Cores.textoSecundario, lineHeight: 21, flexShrink: 1 },
  botoes: { flexDirection: 'row', gap: Espaco.md },
});
