import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { enderecoVazio, errosEndereco, FormEndereco, type Endereco } from '@/components/endereco';
import { Icone } from '@/components/icone';
import { Botao, Caixa, Campo, IconeCirculo, tx } from '@/components/ui';
import { Cores, Espaco, Fonte, Raio } from '@/constants/theme';
import { mensagemErro } from '@/lib/erros';
import { cpfValido, emailValido, mascaraCpf, mascaraTelefone, soDigitos } from '@/lib/formatar';
import { supabase } from '@/lib/supabase';

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState<Endereco>(enderecoVazio);
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [ver, setVer] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [tentou, setTentou] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const erros = {
    nome: nome.trim().split(/\s+/).length < 2 ? 'Digite seu nome completo.' : null,
    cpf: !cpfValido(cpf) ? 'CPF inválido. Confira os números.' : null,
    email: !emailValido(email) ? 'E-mail inválido.' : null,
    telefone: soDigitos(telefone).length < 10 ? 'Informe o celular com DDD.' : null,
    senha: senha.length < 8 || !/\d/.test(senha) || !/[a-zA-Z]/.test(senha) ? 'Mínimo 8 caracteres, com letras e números.' : null,
    senha2: senha2 !== senha ? 'As senhas não são iguais.' : null,
    aceite: !aceite ? 'É preciso concordar para continuar.' : null,
    ...errosEndereco(endereco),
  };
  const valido = !Object.values(erros).some(Boolean);
  const e = (campo: keyof typeof erros) => (tentou ? erros[campo] : null);

  async function cadastrar() {
    setTentou(true);
    if (!valido) {
      setErro('Confira os campos marcados em vermelho.');
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: {
          emailRedirectTo: 'sapcidadao://entrar',
          data: {
            nome: nome.trim(),
            cpf: soDigitos(cpf),
            telefone: soDigitos(telefone),
            cep: soDigitos(endereco.cep),
            logradouro: endereco.logradouro.trim(),
            numero: endereco.numero.trim(),
            complemento: endereco.complemento.trim(),
            bairro: endereco.bairro.trim(),
            termos_aceitos: true,
          },
        },
      });
      if (error) throw error;
      // Se a confirmação de e-mail estiver desligada, já entra direto.
      if (data.session) router.replace('/');
      else setEnviado(true);
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setCarregando(false);
    }
  }

  if (enviado) {
    return (
      <View style={[st.tela, { flex: 1, justifyContent: 'center' }]}>
        <View style={{ alignItems: 'center', gap: Espaco.md }}>
          <IconeCirculo nome="email-check-outline" cor={Cores.sucesso} tamanho={88} />
          <Text style={[tx.titulo, { textAlign: 'center' }]}>Confirme seu e-mail</Text>
          <Text style={[tx.corpo, { textAlign: 'center' }]}>
            Enviamos um link para <Text style={{ fontWeight: '800' }}>{email.trim().toLowerCase()}</Text>. Abra o e-mail e
            toque em confirmar. Depois é só entrar com seu CPF e senha.
          </Text>
          <Text style={[tx.secundario, { textAlign: 'center' }]}>Não chegou? Olhe a caixa de spam.</Text>
        </View>
        <Botao titulo="Ir para o login" icone="login" onPress={() => router.replace('/entrar')} estilo={{ marginTop: Espaco.xl }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.tela} keyboardShouldPersistTaps="handled">
        <Text style={tx.secundario}>Preencha seus dados. Leva menos de 2 minutos.</Text>

        <Text style={st.grupo}>Seus dados</Text>
        <Campo rotulo="Nome completo" icone="account-outline" value={nome} onChangeText={setNome} erro={e('nome')} autoCapitalize="words" autoComplete="name" />
        <Campo
          rotulo="CPF"
          icone="card-account-details-outline"
          placeholder="000.000.000-00"
          keyboardType="number-pad"
          value={cpf}
          onChangeText={(t) => setCpf(mascaraCpf(t))}
          erro={e('cpf')}
          maxLength={14}
          ajuda="Você vai usar o CPF para entrar no app."
        />
        <Campo
          rotulo="E-mail"
          icone="email-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          erro={e('email')}
          ajuda="Para confirmar a conta e recuperar a senha."
        />
        <Campo
          rotulo="Celular (com DDD)"
          icone="cellphone"
          placeholder="(43) 99999-9999"
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={(t) => setTelefone(mascaraTelefone(t))}
          erro={e('telefone')}
          autoComplete="tel"
        />

        <Text style={st.grupo}>Endereço</Text>
        <FormEndereco valor={endereco} onChange={setEndereco} mostrarErros={tentou} />

        <Text style={st.grupo}>Senha</Text>
        <Campo
          rotulo="Crie uma senha"
          icone="lock-outline"
          secureTextEntry={!ver}
          value={senha}
          onChangeText={setSenha}
          erro={e('senha')}
          ajuda="Mínimo 8 caracteres, com letras e números."
          autoComplete="new-password"
          direita={
            <Pressable onPress={() => setVer(!ver)} hitSlop={12} accessibilityRole="button" accessibilityLabel={ver ? 'Esconder senha' : 'Mostrar senha'}>
              <Icone nome={ver ? 'eye-off-outline' : 'eye-outline'} cor={Cores.textoSecundario} tamanho={24} />
            </Pressable>
          }
        />
        <Campo rotulo="Repita a senha" icone="lock-check-outline" secureTextEntry={!ver} value={senha2} onChangeText={setSenha2} erro={e('senha2')} autoComplete="new-password" />

        <Pressable
          onPress={() => setAceite(!aceite)}
          style={st.aceite}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: aceite }}>
          <Icone nome={aceite ? 'checkbox-marked' : 'checkbox-blank-outline'} cor={e('aceite') ? Cores.erro : Cores.primaria} tamanho={30} />
          <Text style={st.aceiteTexto}>
            Li e concordo com a{' '}
            <Text style={st.link} onPress={() => router.push('/privacidade')}>
              Política de Privacidade
            </Text>
            . Meus dados serão usados só para os serviços da Prefeitura.
          </Text>
        </Pressable>

        {erro ? <Caixa tipo="erro" texto={erro} /> : null}
        <Botao titulo="Criar conta" icone="check" carregando={carregando} onPress={cadastrar} />
        <Botao titulo="Já tenho conta" variante="texto" onPress={() => router.replace('/entrar')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.xl, gap: Espaco.md, paddingBottom: 56, maxWidth: 560, width: '100%', alignSelf: 'center' },
  grupo: { fontSize: Fonte.grande - 1, fontWeight: '800', color: Cores.primaria, marginTop: Espaco.lg },
  aceite: { flexDirection: 'row', gap: Espaco.md, alignItems: 'flex-start', padding: Espaco.md, borderRadius: Raio.md, backgroundColor: Cores.superficie },
  aceiteTexto: { flex: 1, fontSize: Fonte.normal, color: Cores.texto, lineHeight: 23 },
  link: { color: Cores.primaria, fontWeight: '800', textDecorationLine: 'underline' },
});
