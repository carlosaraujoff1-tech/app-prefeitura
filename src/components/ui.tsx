import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';

import { Cores, Espaco, Fonte, Raio, Sombra, ToqueMinimo } from '@/constants/theme';
import type { StatusSolicitacao } from '@/lib/api';
import { mensagemErro } from '@/lib/erros';

import { Icone, type NomeIcone } from './icone';

// Botão ------------------------------------------------------------------------
type VarianteBotao = 'primario' | 'secundario' | 'contorno' | 'perigo' | 'texto' | 'textoPerigo';

export function Botao({
  titulo,
  icone,
  variante = 'primario',
  carregando,
  desabilitado,
  onPress,
  estilo,
  compacto,
}: {
  titulo: string;
  icone?: NomeIcone;
  variante?: VarianteBotao;
  carregando?: boolean;
  desabilitado?: boolean;
  onPress?: () => void;
  estilo?: ViewStyle;
  compacto?: boolean;
}) {
  const cores: Record<VarianteBotao, { fundo: string; texto: string; borda: string }> = {
    primario: { fundo: Cores.primaria, texto: Cores.branco, borda: Cores.primaria },
    secundario: { fundo: Cores.primariaClara, texto: Cores.primaria, borda: Cores.primariaClara },
    contorno: { fundo: Cores.superficie, texto: Cores.primaria, borda: Cores.primaria },
    perigo: { fundo: Cores.superficie, texto: Cores.erro, borda: Cores.erro },
    texto: { fundo: 'transparent', texto: Cores.primaria, borda: 'transparent' },
    textoPerigo: { fundo: 'transparent', texto: Cores.erro, borda: 'transparent' },
  };
  const c = cores[variante];
  const inativo = desabilitado || carregando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      accessibilityLabel={titulo}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        s.botao,
        compacto && s.botaoCompacto,
        { backgroundColor: c.fundo, borderColor: c.borda, opacity: inativo ? 0.55 : pressed ? 0.85 : 1 },
        estilo,
      ]}>
      {carregando ? (
        <ActivityIndicator color={c.texto} />
      ) : (
        <>
          {icone ? <Icone nome={icone} cor={c.texto} tamanho={compacto ? 20 : 22} /> : null}
          <Text style={[s.botaoTexto, compacto && { fontSize: Fonte.normal }, { color: c.texto }]} numberOfLines={1}>
            {titulo}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// Campo de texto ----------------------------------------------------------------
export function Campo({
  rotulo,
  erro,
  ajuda,
  icone,
  direita,
  ...props
}: TextInputProps & { rotulo: string; erro?: string | null; ajuda?: string; icone?: NomeIcone; direita?: ReactNode }) {
  return (
    <View style={s.campoBloco}>
      <Text style={s.campoRotulo}>{rotulo}</Text>
      <View style={[s.campo, !!erro && { borderColor: Cores.erro }, props.multiline && { alignItems: 'flex-start' }]}>
        {icone ? <Icone nome={icone} cor={Cores.textoSecundario} tamanho={22} /> : null}
        <TextInput
          placeholderTextColor="#6B7785"
          accessibilityLabel={rotulo}
          {...props}
          style={[s.campoInput, props.multiline && { minHeight: 110, textAlignVertical: 'top', paddingTop: 14 }, props.style]}
        />
        {direita}
      </View>
      {erro ? (
        <Text style={s.campoErro} accessibilityLiveRegion="polite">
          {erro}
        </Text>
      ) : ajuda ? (
        <Text style={s.campoAjuda}>{ajuda}</Text>
      ) : null}
    </View>
  );
}

// Cartão --------------------------------------------------------------------------
export function Cartao({
  children,
  onPress,
  estilo,
  rotulo,
}: {
  children: ReactNode;
  onPress?: PressableProps['onPress'];
  estilo?: ViewStyle | ViewStyle[];
  rotulo?: string;
}) {
  if (!onPress) return <View style={[s.cartao, estilo]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      style={({ pressed }) => [s.cartao, estilo, pressed && { opacity: 0.85, transform: [{ scale: 0.995 }] }]}>
      {children}
    </Pressable>
  );
}

// Título de seção com "Ver todos" --------------------------------------------------
export function Secao({ titulo, acao, onAcao }: { titulo: string; acao?: string; onAcao?: () => void }) {
  return (
    <View style={s.secao}>
      <Text style={s.secaoTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      {acao && onAcao ? (
        <Pressable onPress={onAcao} hitSlop={12} accessibilityRole="link" style={s.secaoAcao}>
          <Text style={s.secaoAcaoTexto}>{acao}</Text>
          <Icone nome="chevron-right" cor={Cores.primaria} tamanho={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

// Ícone em círculo colorido --------------------------------------------------------
export function IconeCirculo({
  nome,
  cor = Cores.primaria,
  fundo,
  tamanho = 48,
}: {
  nome: string | null | undefined;
  cor?: string;
  fundo?: string;
  tamanho?: number;
}) {
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2.6,
        backgroundColor: fundo ?? cor + '1A',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icone nome={nome} cor={cor} tamanho={Math.round(tamanho * 0.52)} />
    </View>
  );
}

// Estados: vazio, carregando, erro ----------------------------------------------------
export function Vazio({ icone, titulo, texto, acao }: { icone: NomeIcone; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <View style={s.vazio}>
      <IconeCirculo nome={icone} tamanho={72} />
      <Text style={s.vazioTitulo}>{titulo}</Text>
      {texto ? <Text style={s.vazioTexto}>{texto}</Text> : null}
      {acao}
    </View>
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <View style={s.vazio} accessibilityLabel={texto} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={Cores.primaria} />
      <Text style={s.vazioTexto}>{texto}</Text>
    </View>
  );
}

export function ErroCarregar({ erro, tentarDeNovo }: { erro: unknown; tentarDeNovo: () => void }) {
  return (
    <Vazio
      icone="wifi-off"
      titulo="Não conseguimos carregar"
      texto={mensagemErro(erro)}
      acao={<Botao titulo="Tentar de novo" icone="refresh" variante="contorno" onPress={tentarDeNovo} compacto />}
    />
  );
}

// Esqueleto (área cinza enquanto carrega — parece mais rápido que um "rodando") -------
export function Esqueleto({ altura, largura = '100%', raio = Raio.md, estilo }: { altura: number; largura?: number | `${number}%`; raio?: number; estilo?: ViewStyle }) {
  return <View style={[{ height: altura, width: largura, borderRadius: raio, backgroundColor: '#E2E8F0' }, estilo]} />;
}

// Etiquetas ---------------------------------------------------------------------------
export function Etiqueta({ texto, cor, fundo, icone, estilo }: { texto: string; cor: string; fundo: string; icone?: NomeIcone; estilo?: ViewStyle }) {
  return (
    <View style={[s.etiqueta, { backgroundColor: fundo }, estilo]}>
      {icone ? <Icone nome={icone} cor={cor} tamanho={16} /> : null}
      <Text style={[s.etiquetaTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

export const STATUS: Record<StatusSolicitacao, { rotulo: string; cor: string; fundo: string; icone: NomeIcone }> = {
  aberta: { rotulo: 'Recebida', cor: '#0B4A8F', fundo: '#E7F0FA', icone: 'inbox-arrow-down' },
  em_analise: { rotulo: 'Em análise', cor: '#8A5A00', fundo: '#FFF4D6', icone: 'magnify' },
  em_execucao: { rotulo: 'Em execução', cor: '#6A3FB5', fundo: '#F0EAFB', icone: 'account-hard-hat' },
  concluida: { rotulo: 'Concluída', cor: '#1B7A3D', fundo: '#E5F4EA', icone: 'check-circle' },
  indeferida: { rotulo: 'Não atendida', cor: '#B42318', fundo: '#FDECEA', icone: 'close-circle' },
  cancelada: { rotulo: 'Cancelada', cor: '#4A5868', fundo: '#EEF1F5', icone: 'cancel' },
};

export function EtiquetaStatus({ status }: { status: StatusSolicitacao }) {
  const st = STATUS[status];
  return <Etiqueta texto={st.rotulo} cor={st.cor} fundo={st.fundo} icone={st.icone} />;
}

// Chip de filtro -------------------------------------------------------------------------
export function Chip({ texto, ativo, onPress, icone }: { texto: string; ativo?: boolean; onPress: () => void; icone?: NomeIcone }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!ativo }}
      style={[s.chip, ativo && { backgroundColor: Cores.primaria, borderColor: Cores.primaria }]}>
      {icone ? <Icone nome={icone} cor={ativo ? Cores.branco : Cores.primaria} tamanho={18} /> : null}
      <Text style={[s.chipTexto, ativo && { color: Cores.branco }]}>{texto}</Text>
    </Pressable>
  );
}

// Aviso em caixa (informação, sucesso, erro) ---------------------------------------------
export function Caixa({ tipo = 'info', texto, titulo }: { tipo?: 'info' | 'sucesso' | 'erro' | 'alerta'; texto: string; titulo?: string }) {
  const m = {
    info: { cor: Cores.primaria, fundo: Cores.primariaClara, icone: 'information' as NomeIcone },
    sucesso: { cor: Cores.sucesso, fundo: Cores.sucessoClaro, icone: 'check-circle' as NomeIcone },
    erro: { cor: Cores.erro, fundo: Cores.erroClaro, icone: 'alert-circle' as NomeIcone },
    alerta: { cor: Cores.alerta, fundo: Cores.alertaClaro, icone: 'alert' as NomeIcone },
  }[tipo];
  return (
    <View style={[s.caixa, { backgroundColor: m.fundo }]} accessibilityLiveRegion="polite">
      <Icone nome={m.icone} cor={m.cor} tamanho={22} />
      <View style={{ flex: 1, gap: 2 }}>
        {titulo ? <Text style={[s.caixaTitulo, { color: m.cor }]}>{titulo}</Text> : null}
        <Text style={s.caixaTexto}>{texto}</Text>
      </View>
    </View>
  );
}

export const tx = StyleSheet.create({
  titulo: { fontSize: Fonte.titulo, fontWeight: '800', color: Cores.texto, letterSpacing: -0.3 },
  subtitulo: { fontSize: Fonte.grande, fontWeight: '700', color: Cores.texto },
  corpo: { fontSize: Fonte.normal, color: Cores.texto, lineHeight: 24 },
  secundario: { fontSize: Fonte.pequena + 1, color: Cores.textoSecundario, lineHeight: 21 },
  rotulo: { fontSize: Fonte.pequena, fontWeight: '700', color: Cores.textoSecundario, textTransform: 'uppercase', letterSpacing: 0.6 },
} as Record<string, TextStyle>);

const s = StyleSheet.create({
  botao: {
    minHeight: 54,
    borderRadius: Raio.md,
    borderWidth: 2,
    paddingHorizontal: Espaco.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Espaco.sm,
  },
  botaoCompacto: { minHeight: ToqueMinimo, paddingHorizontal: Espaco.md },
  botaoTexto: { fontSize: Fonte.media, fontWeight: '700' },
  campoBloco: { gap: 6 },
  campoRotulo: { fontSize: Fonte.normal, fontWeight: '700', color: Cores.texto },
  campo: {
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    borderRadius: Raio.md,
    backgroundColor: Cores.superficie,
    paddingHorizontal: Espaco.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.sm,
  },
  campoInput: { flex: 1, minWidth: 0, fontSize: Fonte.media, color: Cores.texto, paddingVertical: 12 },
  campoErro: { color: Cores.erro, fontSize: Fonte.pequena + 1, fontWeight: '600' },
  campoAjuda: { color: Cores.textoSecundario, fontSize: Fonte.pequena },
  cartao: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.lg, ...Sombra },
  secao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Espaco.xl, marginBottom: Espaco.md },
  secaoTitulo: { fontSize: Fonte.grande, fontWeight: '800', color: Cores.texto, letterSpacing: -0.2 },
  secaoAcao: { flexDirection: 'row', alignItems: 'center', minHeight: ToqueMinimo },
  secaoAcaoTexto: { fontSize: Fonte.normal, fontWeight: '700', color: Cores.primaria },
  vazio: { alignItems: 'center', justifyContent: 'center', padding: Espaco.xxl, gap: Espaco.md },
  vazioTitulo: { fontSize: Fonte.grande, fontWeight: '800', color: Cores.texto, textAlign: 'center' },
  vazioTexto: { fontSize: Fonte.normal, color: Cores.textoSecundario, textAlign: 'center', lineHeight: 24 },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Raio.pilula },
  etiquetaTexto: { fontSize: Fonte.pequena, fontWeight: '800' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: Espaco.lg,
    borderRadius: Raio.pilula,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
  },
  chipTexto: { fontSize: Fonte.normal, fontWeight: '700', color: Cores.texto },
  caixa: { flexDirection: 'row', gap: Espaco.md, padding: Espaco.lg, borderRadius: Raio.md, alignItems: 'flex-start' },
  caixaTitulo: { fontSize: Fonte.normal, fontWeight: '800' },
  caixaTexto: { fontSize: Fonte.normal, color: Cores.texto, lineHeight: 23 },
});
