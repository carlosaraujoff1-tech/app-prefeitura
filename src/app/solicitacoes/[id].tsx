import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Botao, Caixa, Campo, Cartao, Carregando, ErroCarregar, IconeCirculo, STATUS, tx } from '@/components/ui';
import { Cores, Espaco, Fonte, Raio } from '@/constants/theme';
import { comoChegar } from '@/lib/abrir';
import { avaliarSolicitacao, buscarSolicitacao, cancelarSolicitacao } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { mensagemErro } from '@/lib/erros';
import { dataCurta, dataHora } from '@/lib/formatar';

function confirmar(titulo: string, texto: string, sim: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${texto}`));
  return new Promise((ok) =>
    Alert.alert(titulo, texto, [
      { text: 'Voltar', style: 'cancel', onPress: () => ok(false) },
      { text: sim, style: 'destructive', onPress: () => ok(true) },
    ]),
  );
}

export default function SolicitacaoDetalhe() {
  const { id, nova, fotosFalharam } = useLocalSearchParams<{ id: string; nova?: string; fotosFalharam?: string }>();
  const { usuarioId } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['solicitacao', id], queryFn: () => buscarSolicitacao(id) });
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (q.isPending) return <Carregando />;
  if (q.isError) return <ErroCarregar erro={q.error} tentarDeNovo={q.refetch} />;

  const { solicitacao: s, historico, fotos } = q.data;
  const podeCancelar = s.status === 'aberta' || s.status === 'em_analise';
  const podeAvaliar = (s.status === 'concluida' || s.status === 'indeferida') && !s.avaliacao_nota;

  async function atualizar() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['solicitacao', id] }),
      qc.invalidateQueries({ queryKey: ['minhas-solicitacoes', usuarioId] }),
    ]);
  }

  async function cancelar() {
    const ok = await confirmar('Cancelar solicitação?', 'A equipe deixará de atender este pedido.', 'Cancelar pedido');
    if (!ok) return;
    setSalvando(true);
    setErro(null);
    try {
      await cancelarSolicitacao(s.id);
      await atualizar();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function avaliar() {
    if (!nota) return;
    setSalvando(true);
    setErro(null);
    try {
      await avaliarSolicitacao(s.id, nota, comentario.trim());
      await atualizar();
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  const st0 = STATUS[s.status];

  return (
    <ScrollView
      contentContainerStyle={st.tela}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} colors={[Cores.primaria]} />}>
      {nova ? (
        <Caixa
          tipo="sucesso"
          titulo="Solicitação enviada!"
          texto={`Guarde o protocolo ${s.protocolo}. Você será avisado a cada atualização.${
            fotosFalharam ? ` Atenção: ${fotosFalharam} foto(s) não foram enviadas.` : ''
          }`}
        />
      ) : null}

      <Cartao estilo={{ gap: Espaco.md }}>
        <View style={st.linha}>
          <IconeCirculo nome={s.tipo?.icone ?? 'clipboard-text-outline'} tamanho={56} />
          <View style={{ flex: 1 }}>
            <Text style={tx.subtitulo}>{s.tipo?.nome ?? 'Solicitação'}</Text>
            <Text style={st.protocolo} selectable>
              Protocolo {s.protocolo}
            </Text>
          </View>
        </View>
        <View style={[st.statusFaixa, { backgroundColor: st0.fundo }]}>
          <Icone nome={st0.icone} cor={st0.cor} tamanho={26} />
          <View style={{ flex: 1 }}>
            <Text style={[st.statusTexto, { color: st0.cor }]}>{st0.rotulo}</Text>
            <Text style={st.statusData}>Aberta em {dataHora(s.criado_em)}</Text>
          </View>
        </View>
        {s.prazo_em && !['concluida', 'indeferida', 'cancelada'].includes(s.status) ? (
          <Text style={st.info}>Prazo estimado: {dataCurta(s.prazo_em + 'T12:00:00Z')}</Text>
        ) : null}
      </Cartao>

      <Cartao estilo={{ gap: Espaco.md }}>
        <Text style={tx.rotulo}>Descrição</Text>
        <Text style={tx.corpo}>{s.descricao}</Text>
        {s.endereco || s.bairro || s.latitude ? (
          <>
            <Text style={[tx.rotulo, { marginTop: Espaco.sm }]}>Local</Text>
            <Text style={tx.corpo}>
              {[s.endereco, s.bairro].filter(Boolean).join(' – ') || 'Marcado no mapa'}
              {s.ponto_referencia ? `\nReferência: ${s.ponto_referencia}` : ''}
            </Text>
            {s.latitude != null ? (
              <Botao
                titulo="Ver no mapa"
                icone="map-outline"
                variante="contorno"
                compacto
                onPress={() => comoChegar(s.latitude, s.longitude)}
              />
            ) : null}
          </>
        ) : null}
        {fotos.length ? (
          <>
            <Text style={[tx.rotulo, { marginTop: Espaco.sm }]}>Fotos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Espaco.md }}>
              {fotos.map((f, i) =>
                f.url ? (
                  <Image
                    key={f.id}
                    source={{ uri: f.url }}
                    style={st.foto}
                    contentFit="cover"
                    transition={150}
                    accessibilityLabel={`Foto ${i + 1} da solicitação`}
                  />
                ) : null,
              )}
            </ScrollView>
          </>
        ) : null}
      </Cartao>

      {/* Linha do tempo */}
      <Text style={[tx.subtitulo, { marginTop: Espaco.sm }]} accessibilityRole="header">
        Andamento
      </Text>
      <Cartao>
        {historico.map((h, i) => {
          const cor = h.status ? STATUS[h.status].cor : Cores.primaria;
          const ultimo = i === historico.length - 1;
          return (
            <View key={h.id} style={st.evento}>
              <View style={st.eventoTrilho}>
                <View style={[st.eventoPonto, { backgroundColor: cor }]}>
                  <Icone nome={h.status ? STATUS[h.status].icone : 'message-text'} cor={Cores.branco} tamanho={14} />
                </View>
                {!ultimo ? <View style={st.eventoLinha} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: ultimo ? 0 : Espaco.lg, gap: 2 }}>
                <Text style={[st.eventoTitulo, { color: cor }]}>
                  {h.status ? STATUS[h.status].rotulo : 'Mensagem da Prefeitura'}
                </Text>
                {h.mensagem ? <Text style={tx.corpo}>{h.mensagem}</Text> : null}
                <Text style={st.info}>{dataHora(h.criado_em)}</Text>
              </View>
            </View>
          );
        })}
      </Cartao>

      {/* Avaliação */}
      {s.avaliacao_nota ? (
        <Cartao estilo={{ gap: Espaco.sm }}>
          <Text style={tx.rotulo}>Sua avaliação</Text>
          <Estrelas valor={s.avaliacao_nota} />
          {s.avaliacao_comentario ? <Text style={tx.corpo}>{s.avaliacao_comentario}</Text> : null}
        </Cartao>
      ) : podeAvaliar ? (
        <Cartao estilo={{ gap: Espaco.md }}>
          <Text style={tx.subtitulo}>Como foi o atendimento?</Text>
          <Estrelas valor={nota} onChange={setNota} />
          <Campo rotulo="Comentário (opcional)" value={comentario} onChangeText={setComentario} multiline maxLength={500} />
          <Botao titulo="Enviar avaliação" icone="star" desabilitado={!nota} carregando={salvando} onPress={avaliar} />
        </Cartao>
      ) : null}

      {erro ? <Caixa tipo="erro" texto={erro} /> : null}

      {podeCancelar ? (
        <Botao titulo="Cancelar solicitação" icone="close-circle-outline" variante="perigo" carregando={salvando} onPress={cancelar} />
      ) : null}
    </ScrollView>
  );
}

function Estrelas({ valor, onChange }: { valor: number; onChange?: (n: number) => void }) {
  const rotulos = ['Muito ruim', 'Ruim', 'Regular', 'Bom', 'Ótimo'];
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole={onChange ? 'adjustable' : 'text'} accessibilityLabel={`Nota ${valor} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          onPress={() => onChange?.(n)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`${n} estrela${n > 1 ? 's' : ''}: ${rotulos[n - 1]}`}
          style={{ padding: 4 }}>
          <Icone nome={n <= valor ? 'star' : 'star-outline'} cor={n <= valor ? '#C98A00' : '#8A96A3'} tamanho={onChange ? 42 : 28} />
        </Pressable>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.lg, gap: Espaco.md, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  protocolo: { fontSize: Fonte.normal, color: Cores.textoSecundario, fontWeight: '700', marginTop: 2 },
  statusFaixa: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, padding: Espaco.md, borderRadius: Raio.md },
  statusTexto: { fontSize: Fonte.media, fontWeight: '900' },
  statusData: { fontSize: Fonte.pequena, color: Cores.textoSecundario },
  info: { fontSize: Fonte.pequena, color: Cores.textoSecundario },
  foto: { width: 140, height: 140, borderRadius: Raio.md, backgroundColor: '#DDE3EA' },
  evento: { flexDirection: 'row', gap: Espaco.md },
  eventoTrilho: { alignItems: 'center', width: 28 },
  eventoPonto: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eventoLinha: { flex: 1, width: 3, backgroundColor: Cores.borda, marginVertical: 2 },
  eventoTitulo: { fontSize: Fonte.normal + 1, fontWeight: '800' },
});
