import { mdiLogin } from '@mdi/js';
import { useState } from 'react';

import { mensagemErro } from '@/lib/erros';
import { cpfValido, mascaraCpf } from '@/lib/formatar';

import { Botao, Caixa, Campo, Entrada } from '../componentes/ui';
import { useSessao } from '../lib/sessao';

export function Entrar() {
  const { entrar } = useSessao();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!cpfValido(cpf)) return setErro('CPF inválido.');
    setCarregando(true);
    setErro(null);
    try {
      await entrar(cpf, senha);
    } catch (err) {
      setErro(mensagemErro(err));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela-login">
      <form className="cartao pilha" onSubmit={enviar} style={{ gap: 18 }}>
        <div className="linha" style={{ gap: 14 }}>
          <img src="./logo.png" alt="" width={52} height={52} style={{ borderRadius: 12 }} />
          <div>
            <h1 style={{ fontSize: 22 }}>Painel SAP Cidadão</h1>
            <p className="texto-2 pequeno">Prefeitura de Santo Antônio da Platina</p>
          </div>
        </div>
        <Campo rotulo="CPF">
          <Entrada value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" autoComplete="username" autoFocus />
        </Campo>
        <Campo rotulo="Senha">
          <Entrada type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
        </Campo>
        {erro ? <Caixa tipo="erro">{erro}</Caixa> : null}
        <Botao type="submit" variante="primario" icone={mdiLogin} carregando={carregando}>
          Entrar
        </Botao>
        <p className="texto-2 pequeno">
          Use o mesmo CPF e senha do app. Só servidores e administradores autorizados entram aqui. Esqueceu a senha? Use “Esqueci minha senha” no app.
        </p>
      </form>
    </div>
  );
}
