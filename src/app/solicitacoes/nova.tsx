import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Botao, Caixa, Campo, Carregando, Chip, IconeCirculo } from '@/components/ui';
import { Cores, Espaco, Fonte, Raio } from '@/constants/theme';
import { abrirSolicitacao, listarBairros, listarTipos } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { mensagemErro } from '@/lib/erros';
import { enviarFotoSolicitacao, escolherFoto } from '@/lib/fotos';
import { enderecoDoPonto, pegarLocalizacao, type Coordenadas } from '@/lib/localizacao';

const MAX_FOTOS = 3;

export default function NovaSolicitacao() {
  const { usuarioId, carregando } = useAuth();
  const params = useLocalSearchParams<{ tipo?: string }>();
  const qc = useQueryClient();
  const tipos = useQuery({ queryKey: ['tipos'], queryFn: listarTipos, staleTime: 30 * 60 * 1000 });
  const bairros = useQuery({ queryKey: ['bairros'], queryFn: listarBairros, staleTime: 60 * 60 * 1000 });

  const [tipoId, setTipoId] = useState<string | null>(params.tipo ?? null);
  const [descricao, setDescricao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [referencia, setReferencia] = useState('');
  const [coords, setCoords] = useState<Coordenadas | null>(null);
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [etapaEnvio, setEtapaEnvio] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [tentou, setTentou] = useState(false);

  if (carregando) return <Carregando />;
  if (!usuarioId) return <Redirect href="/entrar" />;
  if (tipos.isPending) return <Carregando />;

  const tipo = tipos.data?.find((t) => t.id === tipoId) ?? null;
  const problemas = {
    tipo: !tipo ? 'Escolha o tipo de problema.' : null,
    local:
      tipo?.exige_localizacao && !endereco.trim() && !coords ? 'Informe o endereço ou use sua localização.' : null,
    descricao: descricao.trim().length < 10 ? 'Conte com pelo menos 10 letras o que está acontecendo.' : null,
    foto: tipo?.exige_foto && !fotos.length ? 'Este tipo de solicitação precisa de pelo menos 1 foto.' : null,
  };
  const valido = !Object.values(problemas).some(Boolean);

  async function usarLocalizacao() {
    setBuscandoGps(true);
    setErro(null);
    try {
      const c = await pegarLocalizacao();
      if (!c) {
        setErro('Não foi possível usar sua localização. Autorize o acesso nas configurações ou digite o endereço.');
        return;
      }
      setCoords(c);
      const e = await enderecoDoPonto(c);
      if (e?.endereco && !endereco) setEndereco(e.endereco);
      if (e?.bairro && !bairro) {
        const achado = bairros.data?.find((b) => b.nome.toLowerCase() === e.bairro.toLowerCase());
        setBairro(achado?.nome ?? e.bairro);
      }
    } catch {
      setErro('Não foi possível pegar sua localização agora. Digite o endereço.');
    } finally {
      setBuscandoGps(false);
    }
  }

  async function adicionarFoto(origem: 'camera' | 'galeria') {
    try {
      const uri = await escolherFoto(origem);
      if (uri) setFotos((f) => [...f, uri].slice(0, MAX_FOTOS));
    } catch (e) {
      setErro(mensagemErro(e));
    }
  }

  async function enviar() {
    setTentou(true);
    if (!valido || !tipo) return;
    setEnviando(true);
    setErro(null);
    try {
      setEtapaEnvio('Registrando…');
      const sol = await abrirSolicitacao({
        tipo_id: tipo.id,
        descricao: descricao.trim(),
        endereco: endereco.trim(),
        bairro: bairro.trim(),
        ponto_referencia: referencia.trim(),
        latitude: coords?.lat,
        longitude: coords?.lng,
      });
      let falhas = 0;
      for (let i = 0; i < fotos.length; i++) {
        setEtapaEnvio(`Enviando foto ${i + 1} de ${fotos.length}…`);
        try {
          await enviarFotoSolicitacao(sol.id, fotos[i], usuarioId!);
        } catch {
          falhas++;
        }
      }
      qc.invalidateQueries({ queryKey: ['minhas-solicitacoes'] });
      router.replace({
        pathname: '/solicitacoes/[id]',
        params: { id: sol.id, nova: '1', ...(falhas ? { fotosFalharam: String(falhas) } : {}) },
      });
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setEnviando(false);
      setEtapaEnvio('');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.tela} keyboardShouldPersistTaps="handled">
        {/* 1. Tipo */}
        <Passo numero={1} titulo="O que você quer informar?" />
        <View style={st.tipos}>
          {(tipos.data ?? []).map((t) => {
            const ativo = t.id === tipoId;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTipoId(t.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: ativo }}
                accessibilityLabel={`${t.nome}. ${t.descricao ?? ''}`}
                style={[st.tipo, ativo && st.tipoAtivo]}>
                <IconeCirculo
                  nome={t.icone ?? 'alert-circle-outline'}
                  cor={ativo ? Cores.branco : Cores.primaria}
                  fundo={ativo ? Cores.primaria : Cores.primariaClara}
                  tamanho={52}
                />
                <Text style={[st.tipoNome, ativo && { color: Cores.primaria }]}>{t.nome}</Text>
                {t.descricao ? (
                  <Text style={st.tipoDesc} numberOfLines={2}>
                    {t.descricao}
                  </Text>
                ) : null}
                {ativo ? (
                  <View style={st.tipoCheck}>
                    <Icone nome="check-circle" cor={Cores.primaria} tamanho={24} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {tentou && problemas.tipo ? <Text style={st.erro}>{problemas.tipo}</Text> : null}

        {/* 2. Local */}
        <Passo numero={2} titulo="Onde fica?" />
        <Botao
          titulo={coords ? 'Localização marcada ✓' : 'Usar minha localização atual'}
          icone="crosshairs-gps"
          variante={coords ? 'secundario' : 'contorno'}
          carregando={buscandoGps}
          onPress={usarLocalizacao}
        />
        <Campo
          rotulo="Endereço"
          icone="map-marker-outline"
          placeholder="Rua e número aproximado"
          value={endereco}
          onChangeText={setEndereco}
          erro={tentou ? problemas.local : null}
          autoCapitalize="words"
        />
        {bairros.data?.length ? (
          <View style={{ gap: 6 }}>
            <Text style={st.rotulo}>Bairro</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Espaco.sm }}>
              {bairros.data.map((b) => (
                <Chip key={b.id} texto={b.nome} ativo={bairro === b.nome} onPress={() => setBairro(bairro === b.nome ? '' : b.nome)} />
              ))}
            </ScrollView>
          </View>
        ) : null}
        <Campo
          rotulo="Ponto de referência (opcional)"
          icone="sign-direction"
          placeholder="Ex.: em frente à escola"
          value={referencia}
          onChangeText={setReferencia}
        />

        {/* 3. Descrição */}
        <Passo numero={3} titulo="Conte o que está acontecendo" />
        <Campo
          rotulo="Descrição"
          placeholder="Ex.: buraco grande na faixa da direita, risco para motos."
          value={descricao}
          onChangeText={setDescricao}
          multiline
          maxLength={2000}
          erro={tentou ? problemas.descricao : null}
          ajuda={`${descricao.trim().length}/2000`}
        />

        {/* 4. Fotos */}
        <Passo numero={4} titulo={tipo?.exige_foto ? 'Fotos (obrigatório)' : 'Fotos (opcional, ajudam muito)'} />
        <View style={st.fotos}>
          {fotos.map((uri, i) => (
            <View key={uri} style={st.foto}>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`Foto ${i + 1}`} />
              <Pressable
                onPress={() => setFotos((f) => f.filter((x) => x !== uri))}
                style={st.fotoRemover}
                accessibilityRole="button"
                accessibilityLabel={`Remover foto ${i + 1}`}>
                <Icone nome="close" cor={Cores.branco} tamanho={20} />
              </Pressable>
            </View>
          ))}
        </View>
        {fotos.length < MAX_FOTOS ? (
          <View style={{ flexDirection: 'row', gap: Espaco.md }}>
            <Botao titulo="Câmera" icone="camera-outline" variante="secundario" onPress={() => adicionarFoto('camera')} estilo={{ flex: 1 }} compacto />
            <Botao titulo="Galeria" icone="image-outline" variante="secundario" onPress={() => adicionarFoto('galeria')} estilo={{ flex: 1 }} compacto />
          </View>
        ) : null}
        {tentou && problemas.foto ? <Text style={st.erro}>{problemas.foto}</Text> : null}

        {erro ? <Caixa tipo="erro" texto={erro} /> : null}
        {tentou && !valido ? <Caixa tipo="alerta" texto="Confira os campos marcados acima." /> : null}

        <Botao
          titulo={enviando ? etapaEnvio || 'Enviando…' : 'Enviar solicitação'}
          icone="send"
          carregando={enviando}
          onPress={enviar}
          estilo={{ marginTop: Espaco.sm }}
        />
        <Text style={st.nota}>
          Seu nome e telefone ficam visíveis só para a equipe da Prefeitura que vai atender o pedido.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Passo({ numero, titulo }: { numero: number; titulo: string }) {
  return (
    <View style={st.passo}>
      <View style={st.passoNumero}>
        <Text style={st.passoNumeroTexto}>{numero}</Text>
      </View>
      <Text style={st.passoTitulo} accessibilityRole="header">
        {titulo}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.lg, gap: Espaco.md, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  passo: { flexDirection: 'row', alignItems: 'center', gap: Espaco.sm, marginTop: Espaco.lg },
  passoNumero: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passoNumeroTexto: { color: Cores.branco, fontWeight: '900', fontSize: Fonte.normal },
  passoTitulo: { fontSize: Fonte.grande - 1, fontWeight: '800', color: Cores.texto, flex: 1 },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.md },
  tipo: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 2,
    borderColor: Cores.borda,
    padding: Espaco.md,
    gap: 6,
    minHeight: 150,
  },
  tipoAtivo: { borderColor: Cores.primaria, backgroundColor: '#F5F9FE' },
  tipoNome: { fontSize: Fonte.normal + 1, fontWeight: '800', color: Cores.texto },
  tipoDesc: { fontSize: Fonte.pequena, color: Cores.textoSecundario, lineHeight: 19 },
  tipoCheck: { position: 'absolute', top: 10, right: 10 },
  rotulo: { fontSize: Fonte.normal, fontWeight: '700', color: Cores.texto },
  erro: { color: Cores.erro, fontWeight: '700', fontSize: Fonte.pequena + 1 },
  fotos: { flexDirection: 'row', gap: Espaco.md, flexWrap: 'wrap' },
  foto: { width: 100, height: 100, borderRadius: Raio.md, overflow: 'hidden', backgroundColor: '#DDE3EA' },
  fotoRemover: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nota: { fontSize: Fonte.pequena, color: Cores.textoSecundario, textAlign: 'center', lineHeight: 20 },
});
