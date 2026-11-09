import {
  mdiAccountMultipleOutline, mdiAlarm, mdiCheckDecagramOutline, mdiClipboardTextClockOutline, mdiInboxArrowDown,
  mdiStarOutline, mdiTimerAlertOutline,
} from '@mdi/js';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { mensagemErro } from '@/lib/erros';
import { quando } from '@/lib/formatar';

import { Cabecalho, Caixa, Carregando, EtiquetaStatus, Numero, Vazio } from '../componentes/ui';
import { useSessao } from '../lib/sessao';
import { STATUS, type Status } from '../lib/status';
import { supabase } from '../lib/supabase';

type Resumo = {
  por_status: Partial<Record<Status, number>>;
  abertas: number;
  novas_hoje: number;
  atrasadas: number;
  sem_resposta_48h: number;
  concluidas_30d: number;
  nota_media: number | null;
  avaliacoes: number;
  cidadaos: number | null;
  cidadaos_7d: number | null;
  por_dia: { dia: string; n: number }[];
};

export function Inicio() {
  const { perfil, ehAdmin } = useSessao();
  const navegar = useNavigate();
  const resumo = useQuery({
    queryKey: ['resumo'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('painel_resumo');
      if (error) throw error;
      return data as Resumo;
    },
  });
  const urgentes = useQuery({
    queryKey: ['urgentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes')
        .select('id,protocolo,status,criado_em,bairro,endereco,prazo_em,tipo:tipos_solicitacao(nome)')
        .in('status', ['aberta', 'em_analise', 'em_execucao'])
        .order('criado_em', { ascending: true })
        .limit(8);
      if (error) throw error;
      return data as unknown as { id: string; protocolo: string; status: Status; criado_em: string; bairro: string | null; endereco: string | null; prazo_em: string | null; tipo: { nome: string } | null }[];
    },
  });

  const r = resumo.data;
  const maxDia = Math.max(1, ...(r?.por_dia ?? []).map((d) => d.n));
  const primeiroNome = perfil?.nome.split(' ')[0];

  return (
    <>
      <Cabecalho
        titulo={`Olá, ${primeiroNome}!`}
        texto={ehAdmin ? 'Visão geral de todas as secretarias.' : `Solicitações da ${perfil?.secretaria?.nome ?? 'sua secretaria'}.`}
      />
      {resumo.isError ? <Caixa tipo="erro">{mensagemErro(resumo.error)}</Caixa> : null}
      {!r ? (
        <Carregando />
      ) : (
        <>
          <div className="grade grade-4">
            <Numero icone={mdiInboxArrowDown} cor="#0B4A8F" fundo="#E7F0FA" valor={r.por_status.aberta ?? 0} rotulo="Aguardando resposta" href="#/solicitacoes?status=aberta" />
            <Numero icone={mdiClipboardTextClockOutline} cor="#6A3FB5" fundo="#F0EAFB" valor={r.abertas} rotulo="Em andamento (total)" href="#/solicitacoes?status=abertas" />
            <Numero icone={mdiTimerAlertOutline} cor="#B42318" fundo="#FDECEA" valor={r.atrasadas} rotulo="Fora do prazo" href="#/solicitacoes?status=atrasadas" />
            <Numero icone={mdiAlarm} cor="#8A5A00" fundo="#FFF4D6" valor={r.sem_resposta_48h} rotulo="Sem resposta há +48h" href="#/solicitacoes?status=aberta" />
            <Numero icone={mdiCheckDecagramOutline} cor="#1B7A3D" fundo="#E5F4EA" valor={r.concluidas_30d} rotulo="Concluídas (30 dias)" />
            <Numero icone={mdiStarOutline} cor="#C98A00" fundo="#FFF4D6" valor={r.nota_media ? `${String(r.nota_media).replace('.', ',')} ★` : '—'} rotulo={`Nota dos cidadãos (${r.avaliacoes})`} />
            <Numero icone={mdiInboxArrowDown} cor="#0B4A8F" fundo="#E7F0FA" valor={r.novas_hoje} rotulo="Novas hoje" />
            {ehAdmin ? (
              <Numero icone={mdiAccountMultipleOutline} cor="#08376B" fundo="#E7F0FA" valor={r.cidadaos ?? 0} rotulo={`Cidadãos cadastrados (+${r.cidadaos_7d ?? 0} na semana)`} href="#/usuarios" />
            ) : null}
          </div>

          <div className="grade grade-2">
            <div className="cartao pilha">
              <h2>Solicitações nos últimos 30 dias</h2>
              <div className="colunas" role="img" aria-label="Gráfico de solicitações por dia">
                {r.por_dia.map((d) => (
                  <div key={d.dia} title={`${d.dia.split('-').reverse().join('/')}: ${d.n}`} style={{ height: `${(d.n / maxDia) * 100}%` }} />
                ))}
              </div>
              <div className="linha entre texto-2 pequeno">
                <span>há 30 dias</span>
                <span>hoje</span>
              </div>
            </div>
            <div className="cartao pilha">
              <h2>Por situação</h2>
              {(Object.keys(STATUS) as Status[]).map((s) => {
                const n = r.por_status[s] ?? 0;
                const total = Object.values(r.por_status).reduce((a, b) => a + (b ?? 0), 0) || 1;
                return (
                  <div key={s} className="barra-h">
                    <span className="forte">{STATUS[s].rotulo}</span>
                    <div className="fundo">
                      <div className="cheio" style={{ width: `${(n / total) * 100}%`, background: STATUS[s].cor }} />
                    </div>
                    <span className="forte" style={{ textAlign: 'right' }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="cartao sem-padding">
        <div style={{ padding: '18px 20px 6px' }}>
          <h2>Mais antigas aguardando</h2>
          <p className="texto-2 pequeno">Atenda primeiro quem espera há mais tempo.</p>
        </div>
        {urgentes.isPending ? (
          <Carregando />
        ) : !urgentes.data?.length ? (
          <Vazio icone={mdiCheckDecagramOutline} titulo="Tudo em dia!" texto="Nenhuma solicitação em aberto." />
        ) : (
          <table className="tabela">
            <tbody>
              {urgentes.data.map((s) => (
                <tr key={s.id} className="clicavel" onClick={() => navegar(`/solicitacoes/${s.id}`)}>
                  <td className="forte" style={{ width: 130 }}>{s.protocolo}</td>
                  <td>
                    <div className="forte">{s.tipo?.nome}</div>
                    <div className="texto-2 pequeno">{[s.endereco, s.bairro].filter(Boolean).join(' – ') || '—'}</div>
                  </td>
                  <td style={{ width: 150 }}><EtiquetaStatus status={s.status} /></td>
                  <td className="texto-2 pequeno" style={{ width: 130 }}>{quando(s.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
