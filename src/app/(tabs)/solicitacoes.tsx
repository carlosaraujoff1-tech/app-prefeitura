import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Botao, Cartao, ErroCarregar, Esqueleto, EtiquetaStatus, IconeCirculo, Vazio } from '@/components/ui';
import { Cores, Espaco, Fonte } from '@/constants/theme';
import { minhasSolicitacoes } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { quando } from '@/lib/formatar';

export default function MinhasSolicitacoes() {
  const { usuarioId, carregando } = useAuth();
  const q = useQuery({
    queryKey: ['minhas-solicitacoes', usuarioId],
    queryFn: () => minhasSolicitacoes(usuarioId!),
    enabled: !!usuarioId,
  });

  if (carregando) return <Esqueleto altura={120} estilo={{ margin: Espaco.lg, width: 'auto' }} />;
  if (!usuarioId) {
    return (
      <View style={st.centro}>
        <Vazio
          icone="clipboard-text-outline"
          titulo="Acompanhe seus pedidos"
          texto="Entre com seu CPF para abrir solicitações (buraco, iluminação, lixo…) e acompanhar cada etapa."
          acao={
            <View style={{ gap: Espaco.md, alignSelf: 'stretch' }}>
              <Botao titulo="Entrar" icone="login" onPress={() => router.push('/entrar')} />
              <Botao titulo="Criar conta" variante="contorno" onPress={() => router.push('/cadastro')} />
            </View>
          }
        />
      </View>
    );
  }
  if (q.isError && !q.data) return <ErroCarregar erro={q.error} tentarDeNovo={q.refetch} />;

  return (
    <FlatList
      data={q.data ?? []}
      keyExtractor={(s) => s.id}
      contentContainerStyle={st.lista}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} colors={[Cores.primaria]} />}
      ListHeaderComponent={
        <Botao
          titulo="Nova solicitação"
          icone="plus-circle-outline"
          onPress={() => router.push('/solicitacoes/nova')}
          estilo={{ marginBottom: Espaco.sm }}
        />
      }
      ListEmptyComponent={
        q.isPending ? (
          <View style={{ gap: Espaco.md }}>
            <Esqueleto altura={120} />
            <Esqueleto altura={120} />
          </View>
        ) : (
          <Vazio
            icone="clipboard-check-outline"
            titulo="Nenhuma solicitação ainda"
            texto="Quando você avisar a Prefeitura sobre um problema, ele aparece aqui com o andamento."
          />
        )
      }
      renderItem={({ item }) => (
        <Cartao
          onPress={() => router.push({ pathname: '/solicitacoes/[id]', params: { id: item.id } })}
          rotulo={`${item.tipo?.nome ?? 'Solicitação'}, protocolo ${item.protocolo}`}
          estilo={{ gap: Espaco.md }}>
          <View style={st.linha}>
            <IconeCirculo nome={item.tipo?.icone ?? 'clipboard-text-outline'} tamanho={48} />
            <View style={{ flex: 1 }}>
              <Text style={st.tipo}>{item.tipo?.nome ?? 'Solicitação'}</Text>
              <Text style={st.protocolo}>Protocolo {item.protocolo}</Text>
            </View>
            <Icone nome="chevron-right" cor={Cores.textoSecundario} />
          </View>
          {item.endereco || item.bairro ? (
            <View style={st.linhaPequena}>
              <Icone nome="map-marker-outline" cor={Cores.textoSecundario} tamanho={18} />
              <Text style={st.info} numberOfLines={1}>
                {[item.endereco, item.bairro].filter(Boolean).join(' – ')}
              </Text>
            </View>
          ) : null}
          <View style={[st.linhaPequena, { justifyContent: 'space-between' }]}>
            <EtiquetaStatus status={item.status} />
            <Text style={st.info}>Atualizada {quando(item.atualizado_em)}</Text>
          </View>
        </Cartao>
      )}
    />
  );
}

const st = StyleSheet.create({
  centro: { flex: 1, justifyContent: 'center', maxWidth: 560, width: '100%', alignSelf: 'center' },
  lista: { padding: Espaco.lg, gap: Espaco.md, maxWidth: 760, width: '100%', alignSelf: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  linhaPequena: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipo: { fontSize: Fonte.media, fontWeight: '800', color: Cores.texto },
  protocolo: { fontSize: Fonte.pequena + 1, color: Cores.textoSecundario, fontWeight: '600' },
  info: { fontSize: Fonte.pequena, color: Cores.textoSecundario, flexShrink: 1 },
});
