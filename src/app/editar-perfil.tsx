import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import { errosEndereco, FormEndereco, type Endereco } from '@/components/endereco';
import { Botao, Caixa, Campo, Carregando } from '@/components/ui';
import { Cores, Espaco, Fonte } from '@/constants/theme';
import { salvarPerfil, type Perfil } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { mensagemErro } from '@/lib/erros';
import { mascaraCep, mascaraCpf, mascaraTelefone, soDigitos } from '@/lib/formatar';

export default function EditarPerfil() {
  const { usuarioId, perfil, carregando } = useAuth();
  if (carregando) return <Carregando />;
  if (!usuarioId) return <Redirect href="/entrar" />;
  if (!perfil) return <Carregando />;
  // O formulário só monta quando o perfil chegou, já com os valores atuais.
  return <Formulario perfil={perfil} />;
}

function Formulario({ perfil }: { perfil: Perfil }) {
  const qc = useQueryClient();
  const [nome, setNome] = useState(perfil.nome);
  const [telefone, setTelefone] = useState(mascaraTelefone(perfil.telefone ?? ''));
  const [endereco, setEndereco] = useState<Endereco>({
    cep: mascaraCep(perfil.cep ?? ''),
    logradouro: perfil.logradouro ?? '',
    numero: perfil.numero ?? '',
    complemento: perfil.complemento ?? '',
    bairro: perfil.bairro ?? '',
  });
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const erroNome = nome.trim().split(/\s+/).length < 2 ? 'Digite seu nome completo.' : null;
  const erroTel = soDigitos(telefone).length < 10 ? 'Informe o celular com DDD.' : null;

  async function salvar() {
    setTentou(true);
    setOk(false);
    if (erroNome || erroTel || Object.values(errosEndereco(endereco)).some(Boolean)) return;
    setSalvando(true);
    setErro(null);
    try {
      await salvarPerfil(perfil.id, {
        nome: nome.trim(),
        telefone: soDigitos(telefone),
        cep: soDigitos(endereco.cep) || null,
        logradouro: endereco.logradouro.trim(),
        numero: endereco.numero.trim(),
        complemento: endereco.complemento.trim() || null,
        bairro: endereco.bairro.trim(),
      });
      await qc.invalidateQueries({ queryKey: ['perfil', perfil.id] });
      setOk(true);
      setTimeout(() => router.back(), 700);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={st.tela} keyboardShouldPersistTaps="handled">
        <Campo rotulo="CPF" value={mascaraCpf(perfil.cpf)} editable={false} ajuda="O CPF não pode ser alterado." />
        <Campo rotulo="E-mail" value={perfil.email ?? ''} editable={false} />
        <Campo rotulo="Nome completo" value={nome} onChangeText={setNome} erro={tentou ? erroNome : null} autoCapitalize="words" />
        <Campo
          rotulo="Celular (com DDD)"
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={(t) => setTelefone(mascaraTelefone(t))}
          erro={tentou ? erroTel : null}
        />
        <Text style={st.grupo}>Endereço</Text>
        <FormEndereco valor={endereco} onChange={setEndereco} mostrarErros={tentou} />
        {erro ? <Caixa tipo="erro" texto={erro} /> : null}
        {ok ? <Caixa tipo="sucesso" texto="Dados salvos!" /> : null}
        <Botao titulo="Salvar" icone="content-save-outline" carregando={salvando} onPress={salvar} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  tela: { padding: Espaco.xl, gap: Espaco.md, paddingBottom: 56, maxWidth: 560, width: '100%', alignSelf: 'center' },
  grupo: { fontSize: Fonte.grande - 1, fontWeight: '800', color: Cores.primaria, marginTop: Espaco.md },
});
