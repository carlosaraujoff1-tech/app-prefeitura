import { mdiAccountCogOutline, mdiAccountSearchOutline, mdiDownload } from '@mdi/js';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { mensagemErro } from '@/lib/erros';
import { dataCurta, mascaraCpf, mascaraTelefone } from '@/lib/formatar';

import { useAvisar } from '../componentes/avisos';
import { Botao, Busca, Cabecalho, Caixa, Campo, Carregando, Etiqueta, Interruptor, Modal, Selecao, Vazio } from '../componentes/ui';
import { baixarCsv } from '../lib/csv';
import { useSessao } from '../lib/sessao';
import { supabase } from '../lib/supabase';

type Usuario = {
  id: string;
  nome: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  bairro: string | null;
  tipo: 'cidadao' | 'servidor' | 'admin';
  secretaria_id: string | null;
  ativo: boolean;
  criado_em: string;
  ultimo_acesso: string | null;
  secretaria: { nome: string } | null;
};

const TIPOS = {
  cidadao: { rotulo: 'Cidadão', cor: '#4A5868', fundo: '#EEF1F5' },
  servidor: { rotulo: 'Servidor', cor: '#6A3FB5', fundo: '#F0EAFB' },
  admin: { rotulo: 'Administrador', cor: '#0B4A8F', fundo: '#E7F0FA' },
};

export function Usuarios() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'equipe' | 'todos' | 'cidadao'>('equipe');
  const [editando, setEditando] = useState<Usuario | null>(null);
  const avisar = useAvisar();

  const lista = useQuery({
    queryKey: ['usuarios', filtro, busca],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = supabase
        .from('perfis')
        .select('id,nome,cpf,email,telefone,bairro,tipo,secretaria_id,ativo,criado_em,ultimo_acesso,secretaria:secretarias(nome)', { count: 'exact' })
        .order('nome')
        .limit(200);
      if (filtro === 'equipe') q = q.in('tipo', ['servidor', 'admin']);
      if (filtro === 'cidadao') q = q.eq('tipo', 'cidadao');
      const b = busca.trim().replace(/[,()%*]/g, ' ');
      const d = b.replace(/\D/g, '');
      if (b) q = q.or(`nome.ilike.%${b}%,email.ilike.%${b}%${d.length >= 3 ? `,cpf.like.%${d}%` : ''}`);
      const { data, count, error } = await q;
      if (error) throw error;
      return { itens: data as unknown as Usuario[], total: count ?? 0 };
    },
  });

  async function exportar() {
    const { data, error } = await supabase.from('perfis').select('nome,email,telefone,bairro,tipo,criado_em').order('nome').limit(20000);
    if (error) return avisar(mensagemErro(error), 'erro');
    baixarCsv('usuarios.csv', [
      ['Nome', 'E-mail', 'Telefone', 'Bairro', 'Tipo', 'Cadastro'],
      ...(data as Usuario[]).map((u) => [u.nome, u.email, u.telefone, u.bairro, TIPOS[u.tipo].rotulo, dataCurta(u.criado_em)]),
    ]);
  }

  return (
    <>
      <Cabecalho titulo="Usuários e equipe" texto="Para dar acesso ao painel: a pessoa cria a conta no app com o CPF dela e você a transforma em servidor aqui.">
        <Botao icone={mdiDownload} onClick={exportar}>
          Exportar
        </Botao>
      </Cabecalho>
      <Caixa tipo="info">
        <strong>Servidor</strong> vê e atende só as solicitações da sua secretaria. <strong>Administrador</strong> vê tudo e altera o conteúdo do app. A
        exportação não inclui CPF (LGPD).
      </Caixa>
      <div className="linha">
        <div className="chips">
          {(['equipe', 'cidadao', 'todos'] as const).map((f) => (
            <button key={f} className={`chip ${filtro === f ? 'ativo' : ''}`} onClick={() => setFiltro(f)}>
              {{ equipe: 'Equipe', cidadao: 'Cidadãos', todos: 'Todos' }[f]}
            </button>
          ))}
        </div>
        <Busca valor={busca} aoMudar={setBusca} placeholder="Buscar por nome, e-mail ou CPF" />
      </div>
      <div className="cartao sem-padding">
        {lista.isPending ? (
          <Carregando />
        ) : lista.isError ? (
          <Caixa tipo="erro">{mensagemErro(lista.error)}</Caixa>
        ) : !lista.data.itens.length ? (
          <Vazio icone={mdiAccountSearchOutline} titulo="Ninguém encontrado" />
        ) : (
          <div className="rolagem-x">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>Contato</th>
                  <th>Perfil</th>
                  <th>Cadastro</th>
                  <th>Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {lista.data.itens.map((u) => (
                  <tr key={u.id} className="clicavel" onClick={() => setEditando(u)} style={!u.ativo ? { opacity: 0.55 } : undefined}>
                    <td className="forte">
                      {u.nome}
                      {!u.ativo ? <span className="texto-2 pequeno"> (desativado)</span> : null}
                    </td>
                    <td className="pequeno">{mascaraCpf(u.cpf).replace(/^\d{3}\.\d{3}/, '***.***')}</td>
                    <td className="pequeno">
                      <div>{u.email}</div>
                      <div className="texto-2">{u.telefone ? mascaraTelefone(u.telefone) : ''}</div>
                    </td>
                    <td>
                      <Etiqueta texto={TIPOS[u.tipo].rotulo} cor={TIPOS[u.tipo].cor} fundo={TIPOS[u.tipo].fundo} />
                      {u.secretaria ? <div className="texto-2 pequeno">{u.secretaria.nome}</div> : null}
                    </td>
                    <td className="pequeno">{dataCurta(u.criado_em)}</td>
                    <td className="pequeno texto-2">{u.ultimo_acesso ? dataCurta(u.ultimo_acesso) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {lista.data ? <span className="texto-2 pequeno">{lista.data.total} pessoa(s){lista.data.total > 200 ? ' — mostrando 200, use a busca' : ''}</span> : null}
      {editando ? <EditarUsuario u={editando} aoFechar={() => setEditando(null)} /> : null}
    </>
  );
}

function EditarUsuario({ u, aoFechar }: { u: Usuario; aoFechar: () => void }) {
  const qc = useQueryClient();
  const avisar = useAvisar();
  const { perfil } = useSessao();
  const [tipo, setTipo] = useState(u.tipo);
  const [secretaria, setSecretaria] = useState(u.secretaria_id ?? '');
  const [ativo, setAtivo] = useState(u.ativo);
  const secretarias = useQuery({
    queryKey: ['secretarias-ativas'],
    queryFn: async () => (await supabase.from('secretarias').select('id,nome').eq('ativo', true).order('nome')).data as { id: string; nome: string }[],
  });
  const salvar = useMutation({
    mutationFn: async () => {
      if (tipo === 'servidor' && !secretaria) throw new Error('Escolha a secretaria do servidor.');
      const { error } = await supabase
        .from('perfis')
        .update({ tipo, secretaria_id: tipo === 'cidadao' ? null : secretaria || null, ativo })
        .eq('id', u.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      avisar('Acesso atualizado.', 'sucesso');
      aoFechar();
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });
  const ehVoce = perfil?.id === u.id;

  return (
    <Modal
      titulo={u.nome}
      aoFechar={aoFechar}
      largura={560}
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" icone={mdiAccountCogOutline} carregando={salvar.isPending} onClick={() => salvar.mutate()}>
            Salvar acesso
          </Botao>
        </>
      }>
      <p className="texto-2">
        {u.email} · CPF {mascaraCpf(u.cpf)} · cadastro em {dataCurta(u.criado_em)}
      </p>
      {ehVoce ? <Caixa tipo="alerta">Este é você. Cuidado ao tirar seu próprio acesso.</Caixa> : null}
      <Campo rotulo="Perfil">
        <Selecao value={tipo} onChange={(e) => setTipo(e.target.value as Usuario['tipo'])}>
          <option value="cidadao">Cidadão (só usa o app)</option>
          <option value="servidor">Servidor (atende a sua secretaria no painel)</option>
          <option value="admin">Administrador (acesso total)</option>
        </Selecao>
      </Campo>
      {tipo !== 'cidadao' ? (
        <Campo rotulo={tipo === 'servidor' ? 'Secretaria *' : 'Secretaria (opcional)'}>
          <Selecao value={secretaria} onChange={(e) => setSecretaria(e.target.value)}>
            <option value="">— escolha —</option>
            {secretarias.data?.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Selecao>
        </Campo>
      ) : null}
      <Interruptor marcado={ativo} aoMudar={setAtivo} rotulo={ativo ? 'Conta ativa' : 'Conta desativada (não consegue entrar)'} />
    </Modal>
  );
}
