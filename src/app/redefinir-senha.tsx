import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao, Caixa, Campo, Carregando, IconeCirculo, tx } from '@/components/ui';
import { Espaco } from '@/constants/theme';
import { mensagemErro } from '@/lib/erros';
import { supabase } from '@/lib/supabase';

// Aberta pelo link do e-mail "redefinir senha" (sapcidadao://redefinir-senha#access_token=...).
export default function RedefinirSenha() {
  const url = Linking.useLinkingURL();
  const [pronto, setPronto] = useState(false);
  const [erroLink, setErroLink] = useState<string | null>(null);
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setPronto(true);
        return;
      }
      if (!url) return;
      const fragmento = url.split('#')[1] ?? url.split('?')[1] ?? '';
      const p = new URLSearchParams(fragmento);
      const access_token = p.get('access_token');
      const refresh_token = p.get('refresh_token');
      if (p.get('error_description')) {
        setErroLink('O link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".');
        return;
      }
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) setErroLink('O link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".');
        else setPronto(true);
      }
    })();
  }, [url]);

  async function salvar() {
    if (senha.length < 8 || !/\d/.test(senha) || !/[a-zA-Z]/.test(senha)) {
      setErro('A senha precisa ter 8 caracteres ou mais, com letras e números.');
      return;
    }
    if (senha !== senha2) {
      setErro('As senhas não são iguais.');
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      setOk(true);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setCarregando(false);
    }
  }

  if (erroLink) {
    return (
      <View style={st.tela}>
        <Caixa tipo="erro" texto={erroLink} />
        <Botao titulo="Pedir novo link" onPress={() => router.replace('/esqueci-senha')} />
      </View>
    );
  }
  if (!pronto) return <Carregando texto="Validando o link…" />;
  if (ok) {
    return (
      <View style={[st.tela, { alignItems: 'center' }]}>
        <IconeCirculo nome="check-circle-outline" tamanho={88} />
        <Text style={tx.titulo}>Senha alterada!</Text>
        <Botao titulo="Ir para o início" onPress={() => router.replace('/')} estilo={{ alignSelf: 'stretch' }} />
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={st.tela} keyboardShouldPersistTaps="handled">
      <Text style={tx.corpo}>Crie uma nova senha para sua conta.</Text>
      <Campo rotulo="Nova senha" icone="lock-outline" secureTextEntry value={senha} onChangeText={setSenha} ajuda="Mínimo 8 caracteres, com letras e números." />
      <Campo rotulo="Repita a nova senha" icone="lock-check-outline" secureTextEntry value={senha2} onChangeText={setSenha2} />
      {erro ? <Caixa tipo="erro" texto={erro} /> : null}
      <Botao titulo="Salvar nova senha" icone="check" carregando={carregando} onPress={salvar} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.xl, gap: Espaco.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
