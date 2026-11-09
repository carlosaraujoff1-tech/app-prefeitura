import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Cores, Espaco, Fonte, Raio, ToqueMinimo } from '@/constants/theme';
import { definirLembrete, meusLembretes, removerLembrete, type Evento } from '@/lib/api';
import { useAgora } from '@/lib/agora';
import { useAuth } from '@/lib/auth';
import { mensagemErro } from '@/lib/erros';

import { Icone } from './icone';
import { Botao, Caixa } from './ui';

export const OPCOES_LEMBRETE = [
  { minutos: 15, texto: '15 minutos antes' },
  { minutos: 30, texto: '30 minutos antes' },
  { minutos: 60, texto: '1 hora antes' },
  { minutos: 120, texto: '2 horas antes' },
  { minutos: 1440, texto: '1 dia antes' },
  { minutos: 2880, texto: '2 dias antes' },
];

export function useLembretes() {
  const { usuarioId } = useAuth();
  return useQuery({ queryKey: ['lembretes', usuarioId], queryFn: meusLembretes, enabled: !!usuarioId });
}

// Botão de sino: abre a escolha de "quanto tempo antes" avisar.
export function BotaoLembrete({ evento, grande }: { evento: Evento; grande?: boolean }) {
  const { usuarioId } = useAuth();
  const lembretes = useLembretes();
  const atual = lembretes.data?.find((l) => l.evento_id === evento.id);
  const [aberto, setAberto] = useState(false);
  const agora = useAgora();
  const jaPassou = new Date(evento.inicio_em).getTime() <= agora;
  if (jaPassou && !atual) return null;

  const rotulo = atual ? `Lembrete ativo: ${textoAntecedencia(atual.antecedencia_minutos)}` : 'Ativar lembrete';

  return (
    <>
      {grande ? (
        <Botao
          titulo={atual ? `Aviso ${textoAntecedencia(atual.antecedencia_minutos)}` : 'Me avise antes'}
          icone={atual ? 'bell-ring' : 'bell-outline'}
          variante={atual ? 'secundario' : 'primario'}
          onPress={() => (usuarioId ? setAberto(true) : router.push('/entrar'))}
        />
      ) : (
        <Pressable
          onPress={() => (usuarioId ? setAberto(true) : router.push('/entrar'))}
          style={[st.sino, atual && { backgroundColor: '#FFF4D6' }]}
          accessibilityRole="button"
          accessibilityLabel={rotulo}
          hitSlop={6}>
          <Icone nome={atual ? 'bell-ring' : 'bell-outline'} cor={atual ? '#8A5A00' : Cores.primaria} tamanho={26} />
        </Pressable>
      )}
      <EscolherLembrete evento={evento} aberto={aberto} fechar={() => setAberto(false)} atual={atual?.antecedencia_minutos} />
    </>
  );
}

export function textoAntecedencia(min: number) {
  return OPCOES_LEMBRETE.find((o) => o.minutos === min)?.texto ?? `${min} minutos antes`;
}

function EscolherLembrete({
  evento,
  aberto,
  fechar,
  atual,
}: {
  evento: Evento;
  aberto: boolean;
  fechar: () => void;
  atual?: number;
}) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { usuarioId } = useAuth();
  const [erro, setErro] = useState<string | null>(null);
  const agora = useAgora();
  const inicio = new Date(evento.inicio_em).getTime();

  const salvar = useMutation({
    mutationFn: (min: number | null) => (min ? definirLembrete(evento.id, min) : removerLembrete(evento.id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lembretes', usuarioId] });
      fechar();
    },
    onError: (e) => setErro(mensagemErro(e)),
  });

  return (
    <Modal visible={aberto} transparent animationType="slide" onRequestClose={fechar} statusBarTranslucent>
      <Pressable style={st.fundo} onPress={fechar} accessibilityLabel="Fechar" />
      <View style={[st.folha, { paddingBottom: insets.bottom + Espaco.lg }]}>
        <View style={st.alca} />
        <Text style={st.titulo}>Quando quer ser avisado?</Text>
        <Text style={st.subtitulo} numberOfLines={2}>
          {evento.titulo}
        </Text>
        <View style={{ gap: Espaco.sm, marginTop: Espaco.md }}>
          {OPCOES_LEMBRETE.map((o) => {
            const passou = inicio - o.minutos * 60000 <= agora;
            const marcado = atual === o.minutos;
            return (
              <Pressable
                key={o.minutos}
                disabled={passou || salvar.isPending}
                onPress={() => salvar.mutate(o.minutos)}
                accessibilityRole="radio"
                accessibilityState={{ checked: marcado, disabled: passou }}
                style={[st.opcao, marcado && st.opcaoMarcada, passou && { opacity: 0.4 }]}>
                <Icone nome={marcado ? 'radiobox-marked' : 'radiobox-blank'} cor={Cores.primaria} tamanho={24} />
                <Text style={st.opcaoTexto}>{o.texto}</Text>
                {passou ? <Text style={st.opcaoObs}>já passou</Text> : null}
              </Pressable>
            );
          })}
        </View>
        {erro ? <Caixa tipo="erro" texto={erro} /> : null}
        {atual ? (
          <Botao
            titulo="Desativar lembrete"
            icone="bell-off-outline"
            variante="perigo"
            carregando={salvar.isPending}
            onPress={() => salvar.mutate(null)}
            estilo={{ marginTop: Espaco.md }}
          />
        ) : null}
        <Text style={st.nota}>Você recebe uma notificação no celular no horário escolhido.</Text>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  sino: {
    width: ToqueMinimo,
    height: ToqueMinimo,
    borderRadius: ToqueMinimo / 2,
    backgroundColor: Cores.primariaClara,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundo: { flex: 1, backgroundColor: 'rgba(10,20,35,0.45)' },
  folha: {
    backgroundColor: Cores.superficie,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Espaco.xl,
    gap: Espaco.xs,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  alca: { width: 44, height: 5, borderRadius: 3, backgroundColor: Cores.borda, alignSelf: 'center', marginBottom: Espaco.md },
  titulo: { fontSize: Fonte.grande, fontWeight: '800', color: Cores.texto },
  subtitulo: { fontSize: Fonte.normal, color: Cores.textoSecundario },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    minHeight: 54,
    paddingHorizontal: Espaco.md,
    borderRadius: Raio.md,
    borderWidth: 1.5,
    borderColor: Cores.borda,
  },
  opcaoMarcada: { borderColor: Cores.primaria, backgroundColor: Cores.primariaClara },
  opcaoTexto: { fontSize: Fonte.media, fontWeight: '700', color: Cores.texto, flex: 1 },
  opcaoObs: { fontSize: Fonte.pequena, color: Cores.textoSecundario },
  nota: { fontSize: Fonte.pequena, color: Cores.textoSecundario, textAlign: 'center', marginTop: Espaco.md },
});
