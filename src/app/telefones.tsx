import { useQuery } from '@tanstack/react-query';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Cartao, ErroCarregar, Esqueleto, IconeCirculo, Secao } from '@/components/ui';
import { Cores, Espaco, Fonte, Raio } from '@/constants/theme';
import { ligar } from '@/lib/abrir';
import { listarLocais } from '@/lib/api';
import { CATEGORIAS_LOCAL } from '@/lib/categorias';

export default function Telefones() {
  const q = useQuery({ queryKey: ['locais'], queryFn: listarLocais, staleTime: 30 * 60 * 1000 });
  if (q.isError && !q.data) return <ErroCarregar erro={q.error} tentarDeNovo={q.refetch} />;
  const comTelefone = (q.data ?? []).filter((l) => l.telefone && l.telefone_util);
  const emergencia = comTelefone.filter((l) => l.categoria === 'emergencia');
  const outros = comTelefone.filter((l) => l.categoria !== 'emergencia');

  return (
    <ScrollView
      contentContainerStyle={st.tela}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} colors={[Cores.primaria]} />}>
      <Text style={st.intro}>Toque no número para ligar.</Text>
      {q.isPending ? (
        <View style={st.grade}>
          {[0, 1, 2, 3].map((i) => (
            <Esqueleto key={i} altura={120} largura="47%" />
          ))}
        </View>
      ) : null}

      {emergencia.length ? <Secao titulo="Emergência" /> : null}
      <View style={st.grade}>
        {emergencia.map((l) => (
          <Pressable
            key={l.id}
            onPress={() => ligar(l.telefone!)}
            accessibilityRole="button"
            accessibilityLabel={`Ligar para ${l.nome}, ${l.telefone}`}
            style={({ pressed }) => [st.emergencia, pressed && { opacity: 0.85 }]}>
            <Text style={st.emergenciaNumero}>{l.telefone}</Text>
            <Text style={st.emergenciaNome} numberOfLines={2}>
              {l.nome}
            </Text>
            <View style={st.emergenciaIcone}>
              <Icone nome="phone" cor={Cores.branco} tamanho={20} />
            </View>
          </Pressable>
        ))}
      </View>

      {outros.length ? <Secao titulo="Prefeitura e serviços" /> : null}
      <View style={{ gap: Espaco.md }}>
        {outros.map((l) => {
          const cat = CATEGORIAS_LOCAL[l.categoria] ?? CATEGORIAS_LOCAL.outros;
          return (
            <Cartao key={l.id} onPress={() => ligar(l.telefone!)} rotulo={`Ligar para ${l.nome}, ${l.telefone}`} estilo={st.item}>
              <IconeCirculo nome={cat.icone} cor={cat.cor} tamanho={48} />
              <View style={{ flex: 1 }}>
                <Text style={st.nome}>{l.nome}</Text>
                <Text style={st.numero}>{l.telefone}</Text>
              </View>
              <Icone nome="phone" cor={Cores.primaria} tamanho={26} />
            </Cartao>
          );
        })}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.lg, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  intro: { fontSize: Fonte.normal, color: Cores.textoSecundario },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.md },
  emergencia: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Cores.erro,
    borderRadius: Raio.lg,
    padding: Espaco.lg,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  emergenciaNumero: { color: Cores.branco, fontSize: 36, fontWeight: '900', letterSpacing: 1 },
  emergenciaNome: { color: '#FFE9E7', fontSize: Fonte.normal, fontWeight: '700' },
  emergenciaIcone: {
    position: 'absolute',
    top: Espaco.md,
    right: Espaco.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  nome: { fontSize: Fonte.media - 1, fontWeight: '800', color: Cores.texto },
  numero: { fontSize: Fonte.normal, color: Cores.primaria, fontWeight: '700' },
});
