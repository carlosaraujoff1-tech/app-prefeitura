import {
  mdiArrowLeft, mdiCamera, mdiLockOutline, mdiMapMarkerOutline, mdiMessageTextOutline, mdiPhone, mdiPrinter,
  mdiSendOutline, mdiShareOutline, mdiStar, mdiWhatsapp,
} from '@mdi/js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { mensagemErro } from '@/lib/erros';
import { dataHora, soDigitos, mascaraTelefone } from '@/lib/formatar';

import { useAvisar } from '../componentes/avisos';
import { AreaTexto, Botao, Caixa, Campo, Carregando, Etiqueta, EtiquetaStatus, Icone, Modal, Selecao } from '../componentes/ui';
import { enviarFotoSolicitacao } from '../lib/imagens';
import { useSessao } from '../lib/sessao';
import { STATUS, STATUS_ABERTOS, type Status } from '../lib/status';
import { supabase } from '../lib/supabase';

type Detalhe = {
  id: string;
  protocolo: string;
  status: Status;
  descricao: string;
  endereco: string | null;
  bairro: string | null;
  ponto_referencia: string | null;
  latitude: number | null;
  longitude: number | null;
  prazo_em: string | null;
  criado_em: string;
  concluida_em: string | null;
  cidadao_nome: string;
  cidadao_telefone: string | null;
  avaliacao_nota: number | null;
  avaliacao_comentario: string | null;
  secretaria_id: string;
  tipo: { nome: string; icone: string | null } | null;
  secretaria: { nome: string } | null;
};
type ItemHistorico = { id: number; status: Status | null; mensagem: string | null; interno: boolean; criado_em: string; autor_nome: string; autor_equipe: boolean };

const RESPOSTAS_PRONTAS = [
  'Recebemos sua solicitação. A equipe fará uma vistoria no local.',
  'A equipe está programada para executar o serviço nos próximos dias.',
  'Serviço concluído. Obrigado por avisar a Prefeitura!',
  'Não foi possível localizar o endereço. Pode informar um ponto de referência abrindo uma nova solicitação?',
];

export function Solicitacao() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const avisar = useAvisar();
  const qc = useQueryClient();
  const { perfil, ehAdmin } = useSessao();
  const [novoStatus, setNovoStatus] = useState<Status | ''>('');
  const [mensagem, setMensagem] = useState('');
  const [nota, setNota] = useState('');
  const [encaminhando, setEncaminhando] = useState(false);
  const [fotoGrande, setFotoGrande] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ['solicitacao', id],
    queryFn: async () => {
      const [sol, hist, anexos] = await Promise.all([
        supabase
          .from('solicitacoes')
          .select('*,tipo:tipos_solicitacao(nome,icone),secretaria:secretarias(nome)')
          .eq('id', id)
          .single(),
        supabase.rpc('painel_historico', { p_id: id }),
        supabase.from('solicitacao_anexos').select('id,caminho,autor_id,criado_em').eq('solicitacao_id', id).order('criado_em'),
      ]);
      if (sol.error) throw sol.error;
      if (hist.error) throw hist.error;
      const lista = (anexos.data ?? []) as { id: string; caminho: string }[];
      let fotos: { id: string; url: string }[] = [];
      if (lista.length) {
        const { data } = await supabase.storage.from('solicitacoes').createSignedUrls(lista.map((a) => a.caminho), 3600);
        fotos = lista.map((a, i) => ({ id: a.id, url: data?.[i]?.signedUrl ?? '' })).filter((f) => f.url);
      }
      return { s: sol.data as unknown as Detalhe, historico: hist.data as ItemHistorico[], fotos };
    },
  });

  const atualizar = () => {
    qc.invalidateQueries({ queryKey: ['solicitacao', id] });
    qc.invalidateQueries({ queryKey: ['solicitacoes'] });
    qc.invalidateQueries({ queryKey: ['resumo'] });
    qc.invalidateQueries({ queryKey: ['contador-abertas'] });
  };

  const responder = useMutation({
    mutationFn: async (p: { status: Status | null; mensagem: string | null; interno: boolean }) => {
      const { error } = await supabase.rpc('atualizar_solicitacao', { p_id: id, p_status: p.status, p_mensagem: p.mensagem, p_interno: p.interno });
      if (error) throw error;
    },
    onSuccess: (_d, p) => {
      atualizar();
      if (p.interno) setNota('');
      else {
        setMensagem('');
        setNovoStatus('');
      }
      avisar(p.interno ? 'Nota interna salva.' : 'Enviado! O cidadão foi avisado.', 'sucesso');
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  const foto = useMutation({
    mutationFn: async (f: File) => enviarFotoSolicitacao(id, f, perfil!.id),
    onSuccess: () => {
      atualizar();
      avisar('Foto anexada.', 'sucesso');
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });

  if (q.isPending) return <Carregando />;
  if (q.isError) return <Caixa tipo="erro">{mensagemErro(q.error)}</Caixa>;
  const { s, historico, fotos } = q.data;
  const aberta = STATUS_ABERTOS.includes(s.status);
  const finalizada = !aberta;
  const podeMudar = s.status !== 'cancelada' && (aberta || ehAdmin);
  const opcoesStatus: Status[] = ['em_analise', 'em_execucao', 'concluida', 'indeferida'];
  const telefone = s.cidadao_telefone ? soDigitos(s.cidadao_telefone) : null;

  function enviarResposta() {
    if (!novoStatus && !mensagem.trim()) return avisar('Escolha uma nova situação ou escreva uma mensagem.', 'erro');
    if (novoStatus === 'indeferida' && !mensagem.trim()) return avisar('Explique ao cidadão por que não será atendida.', 'erro');
    responder.mutate({ status: novoStatus || null, mensagem: mensagem.trim() || null, interno: false });
  }

  return (
    <>
      <div className="linha entre nao-imprimir">
        <Botao variante="fantasma" icone={mdiArrowLeft} onClick={() => navegar(-1)}>
          Voltar
        </Botao>
        <Botao icone={mdiPrinter} onClick={() => window.print()}>
          Imprimir ordem de serviço
        </Botao>
      </div>

      <div className="cartao">
        <div className="linha entre" style={{ alignItems: 'flex-start' }}>
          <div className="linha" style={{ gap: 14, flexWrap: 'nowrap' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--azul-claro)', display: 'grid', placeItems: 'center' }}>
              <Icone nome={s.tipo?.icone} tamanho={30} cor="var(--azul)" />
            </div>
            <div>
              <h1 style={{ fontSize: 22 }}>{s.tipo?.nome}</h1>
              <p className="texto-2">
                Protocolo <strong style={{ color: 'var(--texto)' }}>{s.protocolo}</strong> · {s.secretaria?.nome}
              </p>
            </div>
          </div>
          <div className="pilha" style={{ alignItems: 'flex-end', gap: 6 }}>
            <EtiquetaStatus status={s.status} />
            <span className="texto-2 pequeno">Aberta em {dataHora(s.criado_em)}</span>
            {s.prazo_em ? <span className="pequeno">Prazo: {s.prazo_em.split('-').reverse().join('/')}</span> : null}
          </div>
        </div>
      </div>

      <div className="grade" style={{ gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 1fr)', alignItems: 'start' }}>
        <div className="pilha">
          <div className="cartao pilha">
            <h2>O que o cidadão informou</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{s.descricao}</p>
            <div className="linha" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <Icone d={mdiMapMarkerOutline} cor="var(--texto-2)" />
              <div>
                <div className="forte">{[s.endereco, s.bairro].filter(Boolean).join(' – ') || 'Endereço não informado'}</div>
                {s.ponto_referencia ? <div className="texto-2 pequeno">Referência: {s.ponto_referencia}</div> : null}
                {s.latitude != null ? (
                  <a href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`} target="_blank" rel="noreferrer" className="pequeno forte">
                    Abrir local exato no Google Maps ↗
                  </a>
                ) : null}
              </div>
            </div>
            {fotos.length ? (
              <div className="fotos">
                {fotos.map((f) => (
                  <img key={f.id} src={f.url} alt="Foto da solicitação" onClick={() => setFotoGrande(f.url)} />
                ))}
              </div>
            ) : (
              <p className="texto-2 pequeno">Sem fotos.</p>
            )}
            <div className="nao-imprimir">
              <input ref={arquivo} type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) foto.mutate(f);
                e.target.value = '';
              }} />
              {!finalizada ? (
                <Botao pequeno icone={mdiCamera} carregando={foto.isPending} onClick={() => arquivo.current?.click()}>
                  Anexar foto (ex.: serviço feito)
                </Botao>
              ) : null}
            </div>
          </div>

          <div className="cartao pilha">
            <h2>Andamento</h2>
            <div className="tempo">
              {historico.map((h, i) => {
                const cor = h.status ? STATUS[h.status].cor : h.interno ? 'var(--laranja)' : 'var(--azul)';
                const ultimo = i === historico.length - 1;
                return (
                  <div key={h.id} className="tempo-item">
                    <div className="tempo-trilho">
                      <div className="tempo-ponto" style={{ background: cor }}>
                        <Icone d={h.status ? STATUS[h.status].icone : h.interno ? mdiLockOutline : mdiMessageTextOutline} tamanho={16} cor="#fff" />
                      </div>
                      {!ultimo ? <div className="barra" /> : null}
                    </div>
                    <div className={`tempo-corpo ${h.interno ? 'interno' : ''}`}>
                      <div className="linha" style={{ gap: 8 }}>
                        <strong style={{ color: cor }}>{h.status ? STATUS[h.status].rotulo : h.interno ? 'Nota interna (o cidadão não vê)' : 'Mensagem ao cidadão'}</strong>
                        <span className="texto-2 pequeno">
                          {dataHora(h.criado_em)} · {h.autor_nome === 'Sistema' ? 'Equipe (usuário removido)' : h.autor_equipe && h.autor_nome !== s.cidadao_nome ? h.autor_nome : `${h.autor_nome} (cidadão)`}
                        </span>
                      </div>
                      {h.mensagem ? <p style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{h.mensagem}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {s.avaliacao_nota ? (
            <div className="cartao pilha">
              <h2>Avaliação do cidadão</h2>
              <div className="linha" style={{ gap: 2 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Icone key={n} d={mdiStar} cor={n <= s.avaliacao_nota! ? '#C98A00' : '#D5DDE7'} tamanho={26} />
                ))}
              </div>
              {s.avaliacao_comentario ? <p>“{s.avaliacao_comentario}”</p> : null}
            </div>
          ) : null}
        </div>

        <div className="pilha nao-imprimir">
          <div className="cartao pilha">
            <h2>Cidadão</h2>
            <div className="forte">{s.cidadao_nome}</div>
            {telefone ? (
              <div className="linha">
                <a className="botao pequeno" href={`tel:${telefone}`}>
                  <Icone d={mdiPhone} tamanho={18} /> {mascaraTelefone(telefone)}
                </a>
                <a className="botao pequeno" href={`https://wa.me/55${telefone}`} target="_blank" rel="noreferrer">
                  <Icone d={mdiWhatsapp} tamanho={18} cor="#1B7A3D" /> WhatsApp
                </a>
              </div>
            ) : (
              <span className="texto-2 pequeno">Sem telefone.</span>
            )}
            <span className="texto-2 pequeno">Dados pessoais: use só para atender esta solicitação (LGPD).</span>
          </div>

          {podeMudar ? (
            <div className="cartao pilha">
              <h2>Responder ao cidadão</h2>
              <Campo rotulo="Nova situação">
                <div className="chips">
                  {opcoesStatus.map((st) => (
                    <button key={st} type="button" className={`chip ${novoStatus === st ? 'ativo' : ''}`} onClick={() => setNovoStatus(novoStatus === st ? '' : st)} disabled={st === s.status}>
                      {STATUS[st].rotulo}
                    </button>
                  ))}
                </div>
              </Campo>
              <Campo rotulo="Mensagem (o cidadão recebe no celular)" ajuda={novoStatus === 'indeferida' ? 'Obrigatório explicar o motivo.' : 'Opcional se só mudar a situação.'}>
                <AreaTexto value={mensagem} onChange={(e) => setMensagem(e.target.value)} maxLength={2000} placeholder="Escreva de forma simples e educada." />
              </Campo>
              <div className="chips">
                {RESPOSTAS_PRONTAS.map((r) => (
                  <button key={r} type="button" className="chip pequeno" style={{ fontSize: 12.5, fontWeight: 600 }} onClick={() => setMensagem(r)}>
                    {r.length > 38 ? r.slice(0, 38) + '…' : r}
                  </button>
                ))}
              </div>
              <Botao variante="primario" icone={mdiSendOutline} carregando={responder.isPending && !responder.variables?.interno} onClick={enviarResposta}>
                Enviar ao cidadão
              </Botao>
            </div>
          ) : (
            <Caixa tipo="info">
              {s.status === 'cancelada' ? 'Cancelada pelo cidadão.' : 'Solicitação finalizada. Só um administrador pode reabrir.'}
            </Caixa>
          )}

          <div className="cartao pilha">
            <h2>Nota interna</h2>
            <AreaTexto value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Só a equipe vê. Ex.: levar britadeira, falar com o Sr. João." maxLength={2000} style={{ minHeight: 80 }} />
            <Botao icone={mdiLockOutline} carregando={responder.isPending && !!responder.variables?.interno} onClick={() => nota.trim() && responder.mutate({ status: null, mensagem: nota.trim(), interno: true })}>
              Salvar nota interna
            </Botao>
          </div>

          {aberta ? (
            <Botao icone={mdiShareOutline} onClick={() => setEncaminhando(true)}>
              Encaminhar para outra secretaria
            </Botao>
          ) : null}
        </div>
      </div>

      {encaminhando ? <Encaminhar id={id} atual={s.secretaria_id} aoFechar={() => setEncaminhando(false)} aoConcluir={atualizar} /> : null}
      {fotoGrande ? (
        <Modal titulo="Foto" aoFechar={() => setFotoGrande(null)} largura={900}>
          <img src={fotoGrande} alt="" style={{ width: '100%', borderRadius: 10 }} />
          <a href={fotoGrande} target="_blank" rel="noreferrer">Abrir em tamanho original ↗</a>
        </Modal>
      ) : null}
      <div className="so-imprimir">
        <Etiqueta texto="Ordem de serviço — SAP Cidadão" cor="#000" fundo="#fff" />
      </div>
    </>
  );
}

function Encaminhar({ id, atual, aoFechar, aoConcluir }: { id: string; atual: string; aoFechar: () => void; aoConcluir: () => void }) {
  const avisar = useAvisar();
  const [destino, setDestino] = useState('');
  const [motivo, setMotivo] = useState('');
  const secretarias = useQuery({
    queryKey: ['secretarias-ativas'],
    queryFn: async () => (await supabase.from('secretarias').select('id,nome').eq('ativo', true).order('nome')).data as { id: string; nome: string }[],
  });
  const enviar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('transferir_solicitacao', { p_id: id, p_secretaria_id: destino, p_mensagem: motivo || null });
      if (error) throw error;
    },
    onSuccess: () => {
      aoConcluir();
      aoFechar();
      avisar('Encaminhada. A outra secretaria já vê a solicitação.', 'sucesso');
    },
    onError: (e) => avisar(mensagemErro(e), 'erro'),
  });
  return (
    <Modal
      titulo="Encaminhar solicitação"
      aoFechar={aoFechar}
      largura={520}
      rodape={
        <>
          <Botao onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="primario" disabled={!destino} carregando={enviar.isPending} onClick={() => enviar.mutate()}>
            Encaminhar
          </Botao>
        </>
      }>
      <Caixa tipo="alerta">Depois de encaminhar, sua secretaria deixa de ver esta solicitação (a não ser que você seja administrador).</Caixa>
      <Campo rotulo="Para qual secretaria?">
        <Selecao value={destino} onChange={(e) => setDestino(e.target.value)}>
          <option value="">— escolha —</option>
          {secretarias.data?.filter((x) => x.id !== atual).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </Selecao>
      </Campo>
      <Campo rotulo="Motivo (nota interna)">
        <AreaTexto value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ minHeight: 80 }} />
      </Campo>
    </Modal>
  );
}
