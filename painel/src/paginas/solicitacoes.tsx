import { mdiClipboardSearchOutline, mdiDownload } from '@mdi/js';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';

import { mensagemErro } from '@/lib/erros';
import { dataHora, quando } from '@/lib/formatar';

import { useAvisar } from '../componentes/avisos';
import { Botao, Busca, Cabecalho, Caixa, Carregando, EtiquetaStatus, Icone, Selecao, Vazio } from '../componentes/ui';
import { baixarCsv } from '../lib/csv';
import { useSessao } from '../lib/sessao';
import { STATUS, STATUS_ABERTOS, type Status } from '../lib/status';
import { supabase } from '../lib/supabase';

const POR_PAGINA = 50;

type Item = {
  id: string;
  protocolo: string;
  status: Status;
  criado_em: string;
  atualizado_em: string;
  prazo_em: string | null;
  bairro: string | null;
  endereco: string | null;
  descricao: string;
  cidadao_nome: string;
  cidadao_telefone: string | null;
  avaliacao_nota: number | null;
  tipo: { nome: string; icone: string | null } | null;
  secretaria: { nome: string } | null;
};

const FILTROS: { valor: string; rotulo: string }[] = [
  { valor: 'abertas', rotulo: 'Em andamento' },
  { valor: 'aberta', rotulo: 'Recebidas (sem resposta)' },
  { valor: 'atrasadas', rotulo: 'Fora do prazo' },
  { valor: 'em_analise', rotulo: 'Em análise' },
  { valor: 'em_execucao', rotulo: 'Em execução' },
  { valor: 'concluida', rotulo: 'Concluídas' },
  { valor: 'indeferida', rotulo: 'Não atendidas' },
  { valor: 'cancelada', rotulo: 'Canceladas' },
  { valor: 'todas', rotulo: 'Todas' },
];

const hojeISO = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

function consulta(filtros: { status: string; secretaria: string; tipo: string; bairro: string; busca: string }, contar: boolean) {
  let q = supabase
    .from('solicitacoes')
    .select(
      'id,protocolo,status,criado_em,atualizado_em,prazo_em,bairro,endereco,descricao,cidadao_nome,cidadao_telefone,avaliacao_nota,tipo:tipos_solicitacao(nome,icone),secretaria:secretarias(nome)',
      contar ? { count: 'exact' } : undefined,
    );
  if (filtros.status === 'abertas') q = q.in('status', STATUS_ABERTOS);
  else if (filtros.status === 'atrasadas') q = q.in('status', STATUS_ABERTOS).lt('prazo_em', hojeISO());
  else if (filtros.status !== 'todas') q = q.eq('status', filtros.status);
  if (filtros.secretaria) q = q.eq('secretaria_id', filtros.secretaria);
  if (filtros.tipo) q = q.eq('tipo_id', filtros.tipo);
  if (filtros.bairro) q = q.eq('bairro', filtros.bairro);
  const b = filtros.busca.trim().replace(/[,()%*]/g, ' ');
  if (b) q = q.or(`protocolo.ilike.%${b}%,endereco.ilike.%${b}%,cidadao_nome.ilike.%${b}%,descricao.ilike.%${b}%,bairro.ilike.%${b}%`);
  const antigasPrimeiro = STATUS_ABERTOS.includes(filtros.status as Status) || filtros.status === 'abertas' || filtros.status === 'atrasadas';
  return q.order('criado_em', { ascending: antigasPrimeiro });
}

export function Solicitacoes() {
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const avisar = useAvisar();
  const { ehAdmin } = useSessao();
  const filtros = {
    status: params.get('status') ?? 'abertas',
    secretaria: params.get('secretaria') ?? '',
    tipo: params.get('tipo') ?? '',
    bairro: params.get('bairro') ?? '',
    busca: params.get('busca') ?? '',
  };
  const pagina = Number(params.get('pagina') ?? '0');
  const mudar = (chave: string, valor: string) => {
    const p = new URLSearchParams(params);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    p.delete('pagina');
    setParams(p, { replace: true });
  };

  const lista = useQuery({
    queryKey: ['solicitacoes', filtros, pagina],
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, count, error } = await consulta(filtros, true).range(pagina * POR_PAGINA, pagina * POR_PAGINA + POR_PAGINA - 1);
      if (error) throw error;
      return { itens: data as unknown as Item[], total: count ?? 0 };
    },
  });
  const opcoes = useQuery({
    queryKey: ['opcoes-filtros'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [sec, tip, bai] = await Promise.all([
        supabase.from('secretarias').select('id,nome').order('nome'),
        supabase.from('tipos_solicitacao').select('id,nome').order('nome'),
        supabase.from('bairros').select('nome').order('nome'),
      ]);
      return {
        secretarias: (sec.data ?? []) as { id: string; nome: string }[],
        tipos: (tip.data ?? []) as { id: string; nome: string }[],
        bairros: ((bai.data ?? []) as { nome: string }[]).map((b) => b.nome),
      };
    },
  });

  async function exportar() {
    const { data, error } = await consulta(filtros, false).limit(5000);
    if (error) return avisar(mensagemErro(error), 'erro');
    const itens = data as unknown as Item[];
    baixarCsv(`solicitacoes-${hojeISO()}.csv`, [
      ['Protocolo', 'Tipo', 'Secretaria', 'Situação', 'Aberta em', 'Atualizada em', 'Prazo', 'Endereço', 'Bairro', 'Cidadão', 'Telefone', 'Descrição', 'Nota'],
      ...itens.map((s) => [
        s.protocolo, s.tipo?.nome, s.secretaria?.nome, STATUS[s.status].rotulo, dataHora(s.criado_em), dataHora(s.atualizado_em),
        s.prazo_em?.split('-').reverse().join('/'), s.endereco, s.bairro, s.cidadao_nome, s.cidadao_telefone, s.descricao, s.avaliacao_nota,
      ]),
    ]);
  }

  const total = lista.data?.total ?? 0;
  const paginas = Math.ceil(total / POR_PAGINA);
  const hoje = hojeISO();

  return (
    <>
      <Cabecalho titulo="Solicitações" texto="Pedidos dos cidadãos. Clique em uma linha para atender.">
        <Botao icone={mdiDownload} onClick={exportar}>
          Exportar planilha
        </Botao>
      </Cabecalho>

      <div className="chips" role="tablist">
        {FILTROS.map((f) => (
          <button key={f.valor} className={`chip ${filtros.status === f.valor ? 'ativo' : ''}`} onClick={() => mudar('status', f.valor)} role="tab" aria-selected={filtros.status === f.valor}>
            {f.rotulo}
          </button>
        ))}
      </div>

      <div className="linha">
        <Busca valor={filtros.busca} aoMudar={(v) => mudar('busca', v)} placeholder="Buscar por protocolo, endereço, nome ou descrição" />
        {ehAdmin ? (
          <Selecao value={filtros.secretaria} onChange={(e) => mudar('secretaria', e.target.value)} style={{ width: 220 }} aria-label="Secretaria">
            <option value="">Todas as secretarias</option>
            {opcoes.data?.secretarias.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Selecao>
        ) : null}
        <Selecao value={filtros.tipo} onChange={(e) => mudar('tipo', e.target.value)} style={{ width: 200 }} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {opcoes.data?.tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </Selecao>
        <Selecao value={filtros.bairro} onChange={(e) => mudar('bairro', e.target.value)} style={{ width: 180 }} aria-label="Bairro">
          <option value="">Todos os bairros</option>
          {opcoes.data?.bairros.map((b) => <option key={b} value={b}>{b}</option>)}
        </Selecao>
      </div>

      <div className="cartao sem-padding">
        {lista.isPending ? (
          <Carregando />
        ) : lista.isError ? (
          <Caixa tipo="erro">{mensagemErro(lista.error)}</Caixa>
        ) : !lista.data.itens.length ? (
          <Vazio icone={mdiClipboardSearchOutline} titulo="Nenhuma solicitação aqui" texto="Mude o filtro ou a busca." />
        ) : (
          <div className="rolagem-x">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Protocolo</th>
                  <th>Tipo e local</th>
                  {ehAdmin ? <th>Secretaria</th> : null}
                  <th>Cidadão</th>
                  <th>Situação</th>
                  <th>Aberta</th>
                  <th>Prazo</th>
                </tr>
              </thead>
              <tbody>
                {lista.data.itens.map((s) => {
                  const atrasada = s.prazo_em && s.prazo_em < hoje && STATUS_ABERTOS.includes(s.status);
                  return (
                    <tr key={s.id} className="clicavel" onClick={() => navegar(`/solicitacoes/${s.id}`)}>
                      <td className="forte">{s.protocolo}</td>
                      <td>
                        <div className="linha" style={{ gap: 8, flexWrap: 'nowrap' }}>
                          <Icone nome={s.tipo?.icone} cor="var(--azul)" />
                          <div>
                            <div className="forte">{s.tipo?.nome}</div>
                            <div className="texto-2 pequeno">{[s.endereco, s.bairro].filter(Boolean).join(' – ') || '—'}</div>
                          </div>
                        </div>
                      </td>
                      {ehAdmin ? <td className="pequeno">{s.secretaria?.nome}</td> : null}
                      <td className="pequeno">{s.cidadao_nome}</td>
                      <td><EtiquetaStatus status={s.status} /></td>
                      <td className="pequeno texto-2" title={dataHora(s.criado_em)}>{quando(s.criado_em)}</td>
                      <td className="pequeno" style={{ color: atrasada ? 'var(--vermelho)' : undefined, fontWeight: atrasada ? 800 : undefined }}>
                        {s.prazo_em ? s.prazo_em.split('-').reverse().join('/') : '—'}
                        {atrasada ? ' ⚠' : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total ? (
        <div className="linha entre">
          <span className="texto-2">
            {total} solicitaç{total === 1 ? 'ão' : 'ões'}
            {paginas > 1 ? ` · página ${pagina + 1} de ${paginas}` : ''}
          </span>
          {paginas > 1 ? (
            <div className="linha">
              <Botao pequeno disabled={pagina === 0} onClick={() => setParams((p) => { p.set('pagina', String(pagina - 1)); return p; })}>
                Anterior
              </Botao>
              <Botao pequeno disabled={pagina + 1 >= paginas} onClick={() => setParams((p) => { p.set('pagina', String(pagina + 1)); return p; })}>
                Próxima
              </Botao>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
