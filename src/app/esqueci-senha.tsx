import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao, Caixa, Campo, IconeCirculo, tx } from '@/components/ui';
import { Cores, Espaco } from '@/constants/theme';
import { chamarFuncao } from '@/lib/auth';
import { mensagemErro } from '@/lib/erros';
import { cpfValido, mascaraCpf, soDigitos } from '@/lib/formatar';

export default function EsqueciSenha() {
  const [cpf, setCpf] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);

  async function enviar() {
    if (!cpfValido(cpf)) {
      setErro('CPF inválido. Confira os números.');
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const r = await chamarFuncao<{ email_mascarado: string }>('recuperar-senha', { cpf: soDigitos(cpf) });
      setEnviadoPara(r.email_mascarado);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setCarregando(false);
    }
  }

  if (enviadoPara) {
    return (
      <View style={[st.tela, { flex: 1, justifyContent: 'center' }]}>
        <View style={{ alignItems: 'center', gap: Espaco.md }}>
          <IconeCirculo nome="email-fast-outline" cor={Cores.sucesso} tamanho={88} />
          <Text style={[tx.titulo, { textAlign: 'center' }]}>Verifique seu e-mail</Text>
          <Text style={[tx.corpo, { textAlign: 'center' }]}>
            Enviamos um link para <Text style={{ fontWeight: '800' }}>{enviadoPara}</Text>. Abra o e-mail neste celular e
            toque no link para criar uma nova senha.
          </Text>
          <Text style={[tx.secundario, { textAlign: 'center' }]}>Não chegou? Olhe a caixa de spam.</Text>
        </View>
        <Botao titulo="Voltar para o login" onPress={() => router.replace('/entrar')} estilo={{ marginTop: Espaco.xl }} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={st.tela} keyboardShouldPersistTaps="handled">
      <View style={{ alignItems: 'center', gap: Espaco.sm }}>
        <IconeCirculo nome="lock-reset" tamanho={76} />
        <Text style={[tx.corpo, { textAlign: 'center' }]}>
          Digite seu CPF. Vamos enviar um link para o e-mail do seu cadastro.
        </Text>
      </View>
      <Campo
        rotulo="CPF"
        icone="card-account-details-outline"
        placeholder="000.000.000-00"
        keyboardType="number-pad"
        value={cpf}
        onChangeText={(t) => setCpf(mascaraCpf(t))}
        maxLength={14}
      />
      {erro ? <Caixa tipo="erro" texto={erro} /> : null}
      <Botao titulo="Enviar link" icone="send" carregando={carregando} onPress={enviar} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.xl, gap: Espaco.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
