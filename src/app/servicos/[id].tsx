import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao, Caixa, Carregando, Etiqueta, IconeCirculo, tx } from '@/components/ui';
import { Cores, Espaco } from '@/constants/theme';
import { abrirSite } from '@/lib/abrir';
import { listarServicos } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function ServicoDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuarioId } = useAuth();
  const q = useQuery({ queryKey: ['servicos'], queryFn: listarServicos, staleTime: 10 * 60 * 1000 });
  const s = q.data?.find((x) => x.id === id);

  if (!s) return <Carregando />;

  return (
    <ScrollView contentContainerStyle={st.tela}>
      <Stack.Screen options={{ title: s.nome }} />
      <View style={st.topo}>
        <IconeCirculo nome={s.icone ?? 'file-document-outline'} tamanho={84} />
        {s.categoria ? <Etiqueta texto={s.categoria} cor={Cores.primaria} fundo={Cores.primariaClara} estilo={{ alignSelf: 'center' }} /> : null}
        <Text style={[tx.titulo, { textAlign: 'center' }]}>{s.nome}</Text>
      </View>
      {s.descricao ? <Text style={tx.corpo}>{s.descricao}</Text> : null}

      <View style={{ gap: Espaco.md, marginTop: Espaco.lg }}>
        {s.tipo_solicitacao_id ? (
          <Botao
            titulo="Abrir solicitação"
            icone="plus-circle-outline"
            onPress={() =>
              router.push(
                usuarioId
                  ? { pathname: '/solicitacoes/nova', params: { tipo: s.tipo_solicitacao_id! } }
                  : '/entrar',
              )
            }
          />
        ) : null}
        {s.link_externo ? (
          <>
            <Botao
              titulo="Acessar serviço"
              icone="open-in-new"
              variante={s.tipo_solicitacao_id ? 'contorno' : 'primario'}
              onPress={() => abrirSite(s.link_externo!)}
            />
            <Caixa texto="Este serviço abre no site oficial da Prefeitura." />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.xl, gap: Espaco.lg, maxWidth: 760, width: '100%', alignSelf: 'center' },
  topo: { alignItems: 'center', gap: Espaco.md, marginBottom: Espaco.sm },
});
