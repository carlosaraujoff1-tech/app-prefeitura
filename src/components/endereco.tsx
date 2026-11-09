import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Cores, Espaco, Fonte } from '@/constants/theme';
import { listarBairros } from '@/lib/api';
import { buscarCep } from '@/lib/cep';
import { mascaraCep } from '@/lib/formatar';

import { Campo, Chip } from './ui';

export type Endereco = { cep: string; logradouro: string; numero: string; complemento: string; bairro: string };
export const enderecoVazio: Endereco = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '' };

export function errosEndereco(e: Endereco) {
  return {
    logradouro: e.logradouro.trim().length < 3 ? 'Informe a rua.' : null,
    numero: !e.numero.trim() ? 'Informe o número (ou "s/n").' : null,
    bairro: e.bairro.trim().length < 2 ? 'Escolha ou digite o bairro.' : null,
  };
}

export function FormEndereco({
  valor,
  onChange,
  mostrarErros,
}: {
  valor: Endereco;
  onChange: (e: Endereco) => void;
  mostrarErros: boolean;
}) {
  const bairros = useQuery({ queryKey: ['bairros'], queryFn: listarBairros, staleTime: 60 * 60 * 1000 });
  const [buscando, setBuscando] = useState(false);
  const erros = mostrarErros ? errosEndereco(valor) : { logradouro: null, numero: null, bairro: null };
  const set = (campo: keyof Endereco) => (t: string) => onChange({ ...valor, [campo]: t });

  async function mudarCep(t: string) {
    const cep = mascaraCep(t);
    onChange({ ...valor, cep });
    if (cep.replace(/\D/g, '').length === 8) {
      setBuscando(true);
      const r = await buscarCep(cep);
      setBuscando(false);
      if (r) {
        onChange({
          ...valor,
          cep,
          logradouro: r.logradouro || valor.logradouro,
          bairro: r.bairro || valor.bairro,
        });
      }
    }
  }

  return (
    <View style={{ gap: Espaco.md }}>
      <Campo
        rotulo="CEP"
        icone="mailbox-outline"
        placeholder="86430-000"
        keyboardType="number-pad"
        value={valor.cep}
        onChangeText={mudarCep}
        ajuda="Preenchemos a rua automaticamente."
        direita={buscando ? <ActivityIndicator color={Cores.primaria} /> : null}
        autoComplete="postal-code"
      />
      <Campo
        rotulo="Rua"
        value={valor.logradouro}
        onChangeText={set('logradouro')}
        erro={erros.logradouro}
        autoCapitalize="words"
        autoComplete="street-address"
      />
      <View style={{ flexDirection: 'row', gap: Espaco.md }}>
        <View style={{ width: 120 }}>
          <Campo rotulo="Número" value={valor.numero} onChangeText={set('numero')} erro={erros.numero} />
        </View>
        <View style={{ flex: 1 }}>
          <Campo rotulo="Complemento" placeholder="Opcional" value={valor.complemento} onChangeText={set('complemento')} />
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ fontSize: Fonte.normal, fontWeight: '700', color: Cores.texto }}>Bairro</Text>
        {bairros.data?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Espaco.sm }}>
            {bairros.data.map((b) => (
              <Chip key={b.id} texto={b.nome} ativo={valor.bairro === b.nome} onPress={() => onChange({ ...valor, bairro: b.nome })} />
            ))}
          </ScrollView>
        ) : null}
        <Campo rotulo="Ou digite o bairro" value={valor.bairro} onChangeText={set('bairro')} erro={erros.bairro} autoCapitalize="words" />
      </View>
    </View>
  );
}
