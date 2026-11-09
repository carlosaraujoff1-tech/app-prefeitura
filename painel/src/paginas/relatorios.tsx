import { mdiCancel, mdiCheckDecagramOutline, mdiClipboardTextOutline, mdiDownload, mdiStarOutline, mdiTimerOutline } from '@mdi/js';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { mensagemErro } from '@/lib/erros';

import { Botao, Cabecalho, Caixa, Campo, Carregando, Entrada, Numero } from '../componentes/ui';
import { baixarCsv } from '../lib/csv';
import { supabase } from '../lib/supabase';

type Grupo = { nome: string; n: number; concluidas: number; horas?: number | null };
type Relatorio = {
  total: number;
  concluidas: number;
  canceladas: number;
  nao_atendidas: number;
  em_aberto: number;
  horas_media_conclusao: number | null;
  nota_media: number | null;
  por_tipo: Grupo[];
  por_bairro: Grupo[];
  por_secretaria: Grupo[];
  notas: Record<string, number>;
};

const iso = (d: Date) => new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
const tempo = (h: number | null | undefined) => (h == null ? '—' : h < 48 ? `${String(h).replace('.', ',')} h` : `${(h / 24).toFixed(1).replace('.', ',')} dias`);

export function Relatorios() {
  const [inicio, setInicio] = useState(iso(new Date(Date.now() - 29 * 86400000)));
  const [fim, setFim] = useState(iso(new Date()));
  const q = useQuery({
    queryKey: ['relatorio', inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('painel_relatorio', { p_inicio: inicio, p_fim: fim });
      if (error) throw error;
      return data as Relatorio;
    },
  });
  const atalho = (dias: number) => {
    setInicio(iso(new Date(Date.now() - (dias - 1) * 86400000)));
    setFim(iso(new Date()));
  };
  const r = q.data;

  function exportar() {
    if (!r) return;
    const linhas: (string | number | null | undefined)[][] = [[`Relatório SAP Cidadão de ${inicio} a ${fim}`], []];
    for (const [titulo, lista] of [['Tipo', r.por_tipo], ['Bairro', r.por_bairro], ['Secretaria', r.por_secretaria]] as const) {
      linhas.push([titulo, 'Total', 'Concluídas']);
      lista.forEach((g) => linhas.push([g.nome, g.n, g.concluidas]));
      linhas.push([]);
    }
    baixarCsv(`relatorio-${inicio}-a-${fim}.csv`, linhas);
  }

  return (
    <>
      <Cabecalho titulo="Relatórios" texto="Números das solicitações abertas no período escolhido.">
        <Botao icone={mdiDownload} onClick={exportar} disabled={!r}>
          Exportar planilha
        </Botao>
      </Cabecalho>
      <div className="cartao linha" style={{ alignItems: 'flex-end' }}>
        <Campo rotulo="De">
          <Entrada type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </Campo>
        <Campo rotulo="Até">
          <Entrada type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
        </Campo>
        <div className="chips">
          {[7, 30, 90, 365].map((d) => (
            <button key={d} className="chip" onClick={() => atalho(d)}>
              {d === 365 ? 'Último ano' : `Últimos ${d} dias`}
            </button>
          ))}
        </div>
      </div>
      {q.isError ? <Caixa tipo="erro">{mensagemErro(q.error)}</Caixa> : null}
      {!r ? (
        <Carregando />
      ) : (
        <>
          <div className="grade grade-3">
            <Numero icone={mdiClipboardTextOutline} cor="#0B4A8F" fundo="#E7F0FA" valor={r.total} rotulo="Solicitações no período" />
            <Numero icone={mdiCheckDecagramOutline} cor="#1B7A3D" fundo="#E5F4EA" valor={`${r.concluidas} (${r.total ? Math.round((r.concluidas / r.total) * 100) : 0}%)`} rotulo="Concluídas" />
            <Numero icone={mdiTimerOutline} cor="#6A3FB5" fundo="#F0EAFB" valor={tempo(r.horas_media_conclusao)} rotulo="Tempo médio até concluir" />
            <Numero icone={mdiClipboardTextOutline} cor="#8A5A00" fundo="#FFF4D6" valor={r.em_aberto} rotulo="Ainda em andamento" />
            <Numero icone={mdiCancel} cor="#B42318" fundo="#FDECEA" valor={`${r.nao_atendidas} / ${r.canceladas}`} rotulo="Não atendidas / canceladas" />
            <Numero icone={mdiStarOutline} cor="#C98A00" fundo="#FFF4D6" valor={r.nota_media ? `${String(r.nota_media).replace('.', ',')} ★` : '—'} rotulo="Nota média dos cidadãos" />
          </div>
          <div className="grade grade-2">
            <Barras titulo="Por tipo" lista={r.por_tipo} />
            <Barras titulo="Por bairro" lista={r.por_bairro} />
          </div>
          <div className="cartao sem-padding">
            <div style={{ padding: '18px 20px 6px' }}>
              <h2>Por secretaria</h2>
            </div>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Secretaria</th>
                  <th>Recebidas</th>
                  <th>Concluídas</th>
                  <th>% concluídas</th>
                  <th>Tempo médio</th>
                </tr>
              </thead>
              <tbody>
                {r.por_secretaria.map((g) => (
                  <tr key={g.nome}>
                    <td className="forte">{g.nome}</td>
                    <td>{g.n}</td>
                    <td>{g.concluidas}</td>
                    <td>{g.n ? Math.round((g.concluidas / g.n) * 100) : 0}%</td>
                    <td>{tempo(g.horas)}</td>
                  </tr>
                ))}
                {!r.por_secretaria.length ? (
                  <tr>
                    <td colSpan={5} className="texto-2 centro">Sem solicitações no período.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function Barras({ titulo, lista }: { titulo: string; lista: Grupo[] }) {
  const max = Math.max(1, ...lista.map((g) => g.n));
  return (
    <div className="cartao pilha">
      <h2>{titulo}</h2>
      {lista.length ? (
        lista.slice(0, 12).map((g) => (
          <div key={g.nome} className="barra-h">
            <span className="forte" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.nome}</span>
            <div className="fundo">
              <div className="cheio" style={{ width: `${(g.n / max) * 100}%` }} />
            </div>
            <span className="forte" style={{ textAlign: 'right' }}>{g.n}</span>
          </div>
        ))
      ) : (
        <p className="texto-2">Sem dados no período.</p>
      )}
    </div>
  );
}
