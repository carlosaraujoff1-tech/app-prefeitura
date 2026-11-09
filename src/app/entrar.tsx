import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/icone';
import { Botao, Caixa, Campo, IconeCirculo, tx } from '@/components/ui';
import { Cores, Espaco, Fonte } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { mensagemErro } from '@/lib/erros';
import { cpfValido, mascaraCpf } from '@/lib/formatar';

export default function Entrar() {
  const { entrar } = useAuth();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentou, setTentou] = useState(false);

  const erroCpf = tentou && !cpfValido(cpf) ? 'CPF inválido. Confira os números.' : null;
  const erroSenha = tentou && senha.length < 6 ? 'A senha tem pelo menos 6 caracteres.' : null;

  async function enviar() {
    setTentou(true);
    if (!cpfValido(cpf) || senha.length < 6) return;
    setCarregando(true);
    setErro(null);
    try {
      await entrar(cpf, senha);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.tela} keyboardShouldPersistTaps="handled">
        <View style={st.topo}>
          <IconeCirculo nome="account-lock-outline" tamanho={76} />
          <Text style={[tx.titulo, { textAlign: 'center' }]}>Entre com seu CPF</Text>
          <Text style={[tx.secundario, { textAlign: 'center' }]}>
            Para abrir solicitações, acompanhar pedidos e receber lembretes.
          </Text>
        </View>
        <Campo
          rotulo="CPF"
          icone="card-account-details-outline"
          placeholder="000.000.000-00"
          keyboardType="number-pad"
          value={cpf}
          onChangeText={(t) => setCpf(mascaraCpf(t))}
          erro={erroCpf}
          autoComplete="off"
          maxLength={14}
        />
        <Campo
          rotulo="Senha"
          icone="lock-outline"
          secureTextEntry={!ver}
          value={senha}
          onChangeText={setSenha}
          erro={erroSenha}
          autoComplete="current-password"
          onSubmitEditing={enviar}
          returnKeyType="go"
          direita={
            <Pressable onPress={() => setVer(!ver)} hitSlop={12} accessibilityRole="button" accessibilityLabel={ver ? 'Esconder senha' : 'Mostrar senha'}>
              <Icone nome={ver ? 'eye-off-outline' : 'eye-outline'} cor={Cores.textoSecundario} tamanho={24} />
            </Pressable>
          }
        />
        {erro ? <Caixa tipo="erro" texto={erro} /> : null}
        <Botao titulo="Entrar" icone="login" carregando={carregando} onPress={enviar} />
        <Botao titulo="Esqueci minha senha" variante="texto" onPress={() => router.push('/esqueci-senha')} />
        <View style={st.divisor}>
          <View style={st.linha} />
          <Text style={st.ou}>Ainda não tem conta?</Text>
          <View style={st.linha} />
        </View>
        <Botao titulo="Criar minha conta" icone="account-plus-outline" variante="contorno" onPress={() => router.push('/cadastro')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.xl, gap: Espaco.lg, paddingBottom: 48, maxWidth: 560, width: '100%', alignSelf: 'center' },
  topo: { alignItems: 'center', gap: Espaco.sm, marginBottom: Espaco.sm },
  divisor: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, marginTop: Espaco.sm },
  linha: { flex: 1, height: 1, backgroundColor: Cores.borda },
  ou: { color: Cores.textoSecundario, fontSize: Fonte.pequena + 1, fontWeight: '600' },
});
