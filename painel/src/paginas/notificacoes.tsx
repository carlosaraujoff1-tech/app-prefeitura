import { mdiBellRingOutline, mdiContentSaveOutline, mdiSendOutline } from '@mdi/js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { mensagemErro } from '@/lib/erros';
import { dataHora } from '@/lib/formatar';

import { useAvisar } from '../componentes/avisos';
import { AreaTexto, Botao, Cabecalho, Caixa, Campo, Carregando, Entrada, Interruptor, Vazio, confirmar } from '../componentes/ui';
import { useSessao } from '../lib/sessao';
import { supabase } from '../lib/supabase';

const ROTAS = [
  { valor: '', rotulo: 'Só abrir o app' },
  { valor: '/avisos', rotulo: 'Avisos' },
  { valor: '/noticias', rotulo: 'Notícias' },
  { valor: '/agenda', rotulo: 'Agenda' },
  { valor: '/servicos', rotulo: 'Serviços' },
  { valor: '/solicitacoes/nova', rotulo: 'Abrir solicitação' },
];

export function EnviarNotificacao() {
  const { perfil } = useSessao();
  const avisar = useAvisar();
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState('');
  const [corpo, setCorpo] = useState('');
  const [rota, setRota] = useState('');

  const enviadas = useQuery({
    queryKey: ['notificacoes-gerais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('id,titulo,corpo,rota_destino,criado_em')
        .is('destinatario_id', null)
        .order('criado_em', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as { id: string; titulo: string; corpo: string; rota_destino: string | null; criado_em: string }[];
    },
  });

  const enviar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notificacoes')
        .insert({ titulo: titulo.trim(), corpo: corpo.trim(), rota_destino: rota || null, criado_por: perfil!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitulo('');
      setCorpo('');
      setRota('');
      qc.invalidateQueries({ queryKey: ['notificacoes-gerais'] });
      avisar('Notificação enviada para todos.', 'sucesso');
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  return (
    <>
      <Cabecalho titulo="Enviar notificação" texto="Mensagem para TODOS os cidadãos com o app (comunicados importantes, campanhas, emergências)." />
      <div className="grade" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 380px)', alignItems: 'start' }}>
        <div className="cartao pilha">
          <Campo rotulo="Título" ajuda={`${titulo.length}/60`}>
            <Entrada value={titulo} maxLength={60} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Vacinação contra a gripe" />
          </Campo>
          <Campo rotulo="Mensagem" ajuda={`${corpo.length}/250`}>
            <AreaTexto value={corpo} maxLength={250} onChange={(e) => setCorpo(e.target.value)} placeholder="Texto curto e direto." />
          </Campo>
          <Campo rotulo="Ao tocar, abrir">
            <div className="chips">
              {ROTAS.map((r) => (
                <button key={r.valor} className={`chip ${rota === r.valor ? 'ativo' : ''}`} onClick={() => setRota(r.valor)}>
                  {r.rotulo}
                </button>
              ))}
            </div>
          </Campo>
          <Caixa tipo="alerta">
            Use com moderação: notificações demais fazem as pessoas desativarem o app. A entrega no celular (som/banner) começa a funcionar na próxima
            etapa; até lá a mensagem aparece na tela Notificações do app.
          </Caixa>
          <Botao
            variante="primario"
            icone={mdiSendOutline}
            carregando={enviar.isPending}
            disabled={titulo.trim().length < 3 || corpo.trim().length < 5}
            onClick={() => confirmar(`Enviar para TODOS os cidadãos?\n\n${titulo}\n${corpo}`) && enviar.mutate()}>
            Enviar para todos
          </Botao>
        </div>
        <div className="pilha">
          <div className="rotulo">Como aparece no celular</div>
          <div className="cartao" style={{ background: '#1f2937', color: '#fff' }}>
            <div className="linha" style={{ gap: 8, flexWrap: 'nowrap' }}>
              <img src="./logo.png" alt="" width={22} height={22} style={{ borderRadius: 6 }} />
              <span className="pequeno" style={{ color: '#cbd5e1' }}>SAP Cidadão · agora</span>
            </div>
            <div className="forte" style={{ marginTop: 8 }}>{titulo || 'Título da notificação'}</div>
            <div style={{ color: '#e2e8f0', marginTop: 2 }}>{corpo || 'Texto da mensagem.'}</div>
          </div>
        </div>
      </div>

      <h2>Últimas enviadas para todos</h2>
      <div className="cartao sem-padding">
        {enviadas.isPending ? (
          <Carregando />
        ) : !enviadas.data?.length ? (
          <Vazio icone={mdiBellRingOutline} titulo="Nenhuma notificação geral enviada ainda" />
        ) : (
          <table className="tabela">
            <tbody>
              {enviadas.data.map((n) => (
                <tr key={n.id}>
                  <td>
                    <div className="forte">{n.titulo}</div>
                    <div className="texto-2 pequeno">{n.corpo}</div>
                  </td>
                  <td className="pequeno texto-2" style={{ width: 160 }}>{n.rota_destino ?? '—'}</td>
                  <td className="pequeno texto-2" style={{ width: 170 }}>{dataHora(n.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

type Modelo = { chave: string; descricao: string; ativo: boolean; titulo: string; corpo: string; rota: string | null };
const VARIAVEIS: Record<string, string> = {
  solicitacao_status: '{protocolo} {tipo} {status} {mensagem}',
  solicitacao_mensagem: '{protocolo} {tipo} {mensagem}',
  solicitacao_nova: '{protocolo} {tipo} {bairro}',
  lembrete_evento: '{titulo} {quando} {local}',
};

export function TextosNotificacoes() {
  const q = useQuery({
    queryKey: ['eventos-push'],
    queryFn: async () => {
      const { data, error } = await supabase.from('eventos_push').select('chave,descricao,ativo,titulo,corpo,rota').order('chave');
      if (error) throw error;
      return data as Modelo[];
    },
  });
  return (
    <>
      <Cabecalho titulo="Textos automáticos" texto="Mensagens que o sistema envia sozinho. As palavras entre chaves {assim} são trocadas pelos dados reais." />
      {q.isPending ? <Carregando /> : q.isError ? <Caixa tipo="erro">{mensagemErro(q.error)}</Caixa> : q.data.map((m) => <EditarModelo key={m.chave} m={m} />)}
    </>
  );
}

function EditarModelo({ m }: { m: Modelo }) {
  const avisar = useAvisar();
  const qc = useQueryClient();
  const [d, setD] = useState(m);
  const salvar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('eventos_push').update({ titulo: d.titulo, corpo: d.corpo, ativo: d.ativo }).eq('chave', m.chave);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos-push'] });
      avisar('Texto salvo.', 'sucesso');
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });
  return (
    <div className="cartao pilha">
      <div className="linha entre">
        <h2>{m.descricao}</h2>
        <Interruptor marcado={d.ativo} aoMudar={(v) => setD({ ...d, ativo: v })} rotulo={d.ativo ? 'Ligado' : 'Desligado'} />
      </div>
      <div className="grade grade-2">
        <Campo rotulo="Título">
          <Entrada value={d.titulo} onChange={(e) => setD({ ...d, titulo: e.target.value })} />
        </Campo>
        <Campo rotulo="Texto" ajuda={`Pode usar: ${VARIAVEIS[m.chave] ?? ''}`}>
          <Entrada value={d.corpo} onChange={(e) => setD({ ...d, corpo: e.target.value })} />
        </Campo>
      </div>
      <div>
        <Botao icone={mdiContentSaveOutline} carregando={salvar.isPending} onClick={() => salvar.mutate()} disabled={d.titulo === m.titulo && d.corpo === m.corpo && d.ativo === m.ativo}>
          Salvar
        </Botao>
      </div>
    </div>
  );
}
