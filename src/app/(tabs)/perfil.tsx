import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/icone';
import { Botao, Caixa, Cartao, IconeCirculo, Vazio } from '@/components/ui';
import { Cores, Espaco, Fonte, Raio, Sombra } from '@/constants/theme';
import { excluirConta } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { mensagemErro } from '@/lib/erros';
import { mascaraCpf } from '@/lib/formatar';

function confirmar(titulo: string, texto: string, sim: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${texto}`));
  return new Promise((ok) =>
    Alert.alert(titulo, texto, [
      { text: 'Cancelar', style: 'cancel', onPress: () => ok(false) },
      { text: sim, style: 'destructive', onPress: () => ok(true) },
    ]),
  );
}

export default function Perfil() {
  const { usuarioId, perfil, sair } = useAuth();
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function apagarConta() {
    const ok = await confirmar(
      'Excluir minha conta?',
      'Seus dados pessoais serão apagados e não será possível desfazer. Suas solicitações continuam registradas na Prefeitura, sem seu nome.',
      'Excluir',
    );
    if (!ok) return;
    setExcluindo(true);
    setErro(null);
    try {
      await excluirConta();
      await sair();
      router.replace('/');
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setExcluindo(false);
    }
  }

  const versao = Constants.expoConfig?.version ?? '';

  return (
    <ScrollView contentContainerStyle={st.tela}>
      {usuarioId ? (
        <Cartao estilo={st.cabecalho}>
          <View style={st.avatar}>
            <Text style={st.avatarTexto}>{(perfil?.nome ?? '?').trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.nome} numberOfLines={2}>
              {perfil?.nome ?? 'Carregando…'}
            </Text>
            {perfil?.cpf ? <Text style={st.info}>CPF {mascaraCpf(perfil.cpf)}</Text> : null}
            {perfil?.email ? (
              <Text style={st.info} numberOfLines={1}>
                {perfil.email}
              </Text>
            ) : null}
          </View>
        </Cartao>
      ) : (
        <Cartao>
          <Vazio
            icone="account-circle-outline"
            titulo="Você não entrou"
            texto="Entre para abrir solicitações e receber avisos. Tudo o resto do app funciona sem conta."
            acao={
              <View style={{ gap: Espaco.md, alignSelf: 'stretch' }}>
                <Botao titulo="Entrar com CPF" icone="login" onPress={() => router.push('/entrar')} />
                <Botao titulo="Criar conta" variante="contorno" onPress={() => router.push('/cadastro')} />
              </View>
            }
          />
        </Cartao>
      )}

      <View style={st.grupo}>
        {usuarioId ? (
          <>
            <Item icone="account-edit-outline" titulo="Meus dados" rota="/editar-perfil" />
            <Item icone="clipboard-text-outline" titulo="Minhas solicitações" rota="/solicitacoes" />
            <Item icone="bell-outline" titulo="Notificações" rota="/notificacoes" />
          </>
        ) : null}
        <Item icone="phone-outline" titulo="Telefones úteis" rota="/telefones" />
        <Item icone="map-marker-radius-outline" titulo="Locais da cidade" rota="/locais" />
        <Item icone="shield-lock-outline" titulo="Privacidade e seus dados" rota="/privacidade" ultimo />
      </View>

      {erro ? <Caixa tipo="erro" texto={erro} /> : null}

      {usuarioId ? (
        <View style={{ gap: Espaco.md }}>
          <Botao titulo="Sair da conta" icone="logout" variante="contorno" onPress={() => sair()} />
          <Botao titulo="Excluir minha conta" icone="delete-outline" variante="textoPerigo" carregando={excluindo} onPress={apagarConta} />
        </View>
      ) : null}

      <View style={st.rodape}>
        <IconeCirculo nome="city-variant-outline" tamanho={40} />
        <Text style={st.rodapeTexto}>SAP Cidadão {versao}</Text>
        <Text style={st.rodapeTexto}>Prefeitura Municipal de Santo Antônio da Platina – PR</Text>
      </View>
    </ScrollView>
  );
}

function Item({ icone, titulo, rota, ultimo }: { icone: NomeIcone; titulo: string; rota: Href; ultimo?: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(rota)}
      accessibilityRole="button"
      style={({ pressed }) => [st.item, !ultimo && st.itemBorda, pressed && { backgroundColor: '#F4F7FB' }]}>
      <Icone nome={icone} cor={Cores.primaria} tamanho={26} />
      <Text style={st.itemTexto}>{titulo}</Text>
      <Icone nome="chevron-right" cor={Cores.textoSecundario} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.lg, gap: Espaco.lg, paddingBottom: 48, maxWidth: 760, width: '100%', alignSelf: 'center' },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Espaco.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Cores.primaria, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: Cores.branco, fontSize: 28, fontWeight: '900' },
  nome: { fontSize: Fonte.grande - 1, fontWeight: '800', color: Cores.texto },
  info: { fontSize: Fonte.pequena + 1, color: Cores.textoSecundario, marginTop: 2 },
  grupo: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, overflow: 'hidden', ...Sombra },
  item: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, minHeight: 60, paddingHorizontal: Espaco.lg },
  itemBorda: { borderBottomWidth: 1, borderBottomColor: '#E8EDF3' },
  itemTexto: { flex: 1, fontSize: Fonte.media - 1, fontWeight: '700', color: Cores.texto },
  rodape: { alignItems: 'center', gap: 4, marginTop: Espaco.lg },
  rodapeTexto: { fontSize: Fonte.pequena - 1, color: Cores.textoSecundario, textAlign: 'center' },
});
