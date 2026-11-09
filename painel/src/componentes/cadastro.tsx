import { mdiDeleteOutline, mdiEyeOffOutline, mdiPencilOutline, mdiPlus } from '@mdi/js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';

import { mensagemErro } from '@/lib/erros';
import { partesBR } from '@/lib/formatar';

import type { PastaImagem } from '../lib/imagens';
import { supabase } from '../lib/supabase';
import { useAvisar } from './avisos';
import { CampoImagem } from './campo-imagem';
import { SeletorIcone } from './seletor-icone';
import { AreaTexto, Botao, Busca, Cabecalho, Caixa, Campo, Carregando, Entrada, Interruptor, Modal, Selecao, Vazio, confirmar } from './ui';

export type Linha = Record<string, unknown> & { id: string };

export type DefCampo = {
  nome: string;
  rotulo: string;
  tipo: 'texto' | 'areatexto' | 'numero' | 'booleano' | 'datahora' | 'imagem' | 'icone' | 'cor' | 'selecao' | 'link' | 'coordenadas';
  obrigatorio?: boolean;
  ajuda?: string;
  meia?: boolean; // ocupa meia linha
  padrao?: unknown;
  proporcao?: string;
  pasta?: PastaImagem;
  opcoes?: { valor: string; rotulo: string }[];
  opcoesDe?: { tabela: string; rotulo: string }; // carrega opções de outra tabela
  max?: number;
};

export type DefColuna = { titulo: string; render: (l: Linha) => ReactNode; largura?: number | string };

const SUGESTOES_LINK = ['/servicos', '/agenda', '/locais', '/telefones', '/noticias', '/avisos', '/solicitacoes/nova', 'https://www.santoantoniodaplatina.pr.gov.br/'];

// Converte "2026-11-10T14:30" (horário de Brasília) em data ISO e vice-versa.
const paraEntradaDataHora = (iso: unknown) => {
  if (!iso) return '';
  const p = partesBR(String(iso));
  const d = (n: number) => String(n).padStart(2, '0');
  return `${p.ano}-${d(p.mes + 1)}-${d(p.dia)}T${d(p.hora)}:${d(p.minuto)}`;
};
const deEntradaDataHora = (v: string) => (v ? new Date(`${v}:00-03:00`).toISOString() : null);

// Lê latitude/longitude de um link do Google Maps colado.
function coordenadasDoLink(texto: string): { lat: number; lng: number } | null {
  const t = decodeURIComponent(texto);
  const m =
    t.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ??
    t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ??
    t.match(/(?:destination|q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ??
    t.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}

export function Cadastro({
  tabela,
  titulo,
  descricao,
  singular,
  select = '*',
  ordem,
  campos,
  colunas,
  textoBusca,
  temAtivo = true,
  validar,
  aviso,
}: {
  tabela: string;
  titulo: string;
  descricao: string;
  singular: string;
  select?: string;
  ordem: { coluna: string; asc?: boolean }[];
  campos: DefCampo[];
  colunas: DefColuna[];
  textoBusca: (l: Linha) => string;
  temAtivo?: boolean;
  validar?: (d: Record<string, unknown>) => string | null;
  aviso?: ReactNode;
}) {
  const qc = useQueryClient();
  const avisar = useAvisar();
  const [busca, setBusca] = useState('');
  const [mostrarInativos, setMostrarInativos] = useState(false);
  const [editando, setEditando] = useState<Record<string, unknown> | null>(null);

  const lista = useQuery({
    queryKey: ['cadastro', tabela],
    queryFn: async () => {
      let q = supabase.from(tabela).select(select);
      for (const o of ordem) q = q.order(o.coluna, { ascending: o.asc ?? true });
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      return data as unknown as Linha[];
    },
  });

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return (lista.data ?? []).filter(
      (l) =>
        (!temAtivo || mostrarInativos || l.ativo !== false) &&
        (!t || textoBusca(l).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t)),
    );
  }, [lista.data, busca, mostrarInativos, temAtivo, textoBusca]);
  const inativos = (lista.data ?? []).filter((l) => l.ativo === false).length;

  const salvar = useMutation({
    mutationFn: async (dados: Record<string, unknown>) => {
      const { id, ...resto } = dados;
      const valores: Record<string, unknown> = {};
      for (const c of campos) {
        if (c.tipo === 'coordenadas') {
          valores.latitude = resto.latitude === '' || resto.latitude == null ? null : Number(resto.latitude);
          valores.longitude = resto.longitude === '' || resto.longitude == null ? null : Number(resto.longitude);
          continue;
        }
        let v = resto[c.nome];
        if (typeof v === 'string') v = v.trim();
        if (v === '') v = null;
        if (c.tipo === 'numero' && v != null) v = Number(v);
        if (v == null && !id && c.tipo !== 'booleano') continue; // deixa o valor padrão do banco
        valores[c.nome] = v ?? (c.tipo === 'booleano' ? false : null);
      }
      if (temAtivo && 'ativo' in resto) valores.ativo = resto.ativo;
      const r = id
        ? await supabase.from(tabela).update(valores).eq('id', id as string)
        : await supabase.from(tabela).insert(valores);
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cadastro', tabela] });
      setEditando(null);
      avisar('Salvo! Já aparece no app.', 'sucesso');
    },
    onError: (e) => avisar(traduzir(e), 'erro'),
  });

  const alternar = useMutation({
    mutationFn: async (l: Linha) => {
      const r = await supabase.from(tabela).update({ ativo: !(l.ativo !== false) }).eq('id', l.id);
      if (r.error) throw r.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cadastro', tabela] }),
    onError: (e) => avisar(traduzir(e), 'erro'),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const r = await supabase.from(tabela).delete().eq('id', id);
      if (r.error) throw r.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cadastro', tabela] });
      setEditando(null);
      avisar('Excluído.', 'sucesso');
    },
    onError: (e) => avisar(traduzir(e), 'erro'),
  });

  function novo() {
    const d: Record<string, unknown> = { ativo: true };
    for (const c of campos) d[c.nome] = c.padrao ?? (c.tipo === 'booleano' ? false : '');
    setEditando(d);
  }

  function abrir(l: Linha) {
    setEditando({ ...l });
  }

  function enviar() {
    if (!editando) return;
    for (const c of campos) {
      const v = editando[c.nome];
      if (c.obrigatorio && (v == null || String(v).trim() === '')) return avisar(`Preencha: ${c.rotulo}`, 'erro');
    }
    const erro = validar?.(editando);
    if (erro) return avisar(erro, 'erro');
    salvar.mutate(editando);
  }

  return (
    <>
      <Cabecalho titulo={titulo} texto={descricao}>
        <Botao variante="primario" icone={mdiPlus} onClick={novo}>
          Novo {singular}
        </Botao>
      </Cabecalho>
      {aviso}
      <div className="linha">
        <Busca valor={busca} aoMudar={setBusca} placeholder={`Buscar ${titulo.toLowerCase()}…`} />
        {temAtivo && inativos ? (
          <Interruptor marcado={mostrarInativos} aoMudar={setMostrarInativos} rotulo={`Mostrar desativados (${inativos})`} />
        ) : null}
      </div>
      <div className="cartao sem-padding">
        {lista.isPending ? (
          <Carregando />
        ) : lista.isError ? (
          <Caixa tipo="erro">{mensagemErro(lista.error)}</Caixa>
        ) : !filtrados.length ? (
          <Vazio icone={mdiPlus} titulo="Nada por aqui" texto={busca ? 'Nenhum resultado para a busca.' : `Clique em "Novo ${singular}" para começar.`} />
        ) : (
          <div className="rolagem-x">
            <table className="tabela">
              <thead>
                <tr>
                  {colunas.map((c) => (
                    <th key={c.titulo} style={{ width: c.largura }}>
                      {c.titulo}
                    </th>
                  ))}
                  {temAtivo ? <th style={{ width: 120 }}>No app</th> : null}
                  <th style={{ width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {filtrados.map((l) => (
                  <tr key={l.id} className="clicavel" onClick={() => abrir(l)} style={l.ativo === false ? { opacity: 0.55 } : undefined}>
                    {colunas.map((c) => (
                      <td key={c.titulo}>{c.render(l)}</td>
                    ))}
                    {temAtivo ? (
                      <td onClick={(e) => e.stopPropagation()}>
                        <Interruptor marcado={l.ativo !== false} aoMudar={() => alternar.mutate(l)} rotulo={l.ativo !== false ? 'Visível' : 'Oculto'} />
                      </td>
                    ) : null}
                    <td>
                      <Botao pequeno variante="fantasma" icone={mdiPencilOutline} aria-label="Editar" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando ? (
        <Modal
          titulo={editando.id ? `Editar ${singular}` : `Novo ${singular}`}
          aoFechar={() => setEditando(null)}
          rodape={
            <>
              {editando.id ? (
                <>
                  <Botao
                    variante="perigo"
                    icone={mdiDeleteOutline}
                    carregando={excluir.isPending}
                    style={{ marginRight: temAtivo ? undefined : 'auto' }}
                    onClick={() => confirmar(`Excluir definitivamente? Não dá para desfazer.${temAtivo ? '\nDica: você pode só desativar (some do app, mas fica guardado).' : ''}`) && excluir.mutate(editando.id as string)}>
                    Excluir
                  </Botao>
                  {temAtivo ? (
                    <Botao
                      icone={mdiEyeOffOutline}
                      style={{ marginRight: 'auto' }}
                      onClick={() => setEditando({ ...editando, ativo: !(editando.ativo !== false) })}>
                      {editando.ativo !== false ? 'Desativar' : 'Reativar'}
                    </Botao>
                  ) : null}
                </>
              ) : null}
              <Botao onClick={() => setEditando(null)}>Cancelar</Botao>
              <Botao variante="primario" carregando={salvar.isPending} onClick={enviar}>
                Salvar
              </Botao>
            </>
          }>
          {temAtivo && editando.ativo === false ? <Caixa tipo="alerta">Desativado: não aparece no app.</Caixa> : null}
          <div className="grade grade-2">
            {campos.map((c) => (
              <div key={c.nome} style={{ gridColumn: c.meia ? undefined : '1 / -1' }}>
                <CampoForm def={c} dados={editando} aoMudar={(n, v) => setEditando((d) => ({ ...d, [n]: v }))} />
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function traduzir(e: unknown) {
  const m = mensagemErro(e);
  if (/foreign key|violates foreign/i.test(m)) return 'Não dá para excluir: está sendo usado em outro lugar. Desative em vez de excluir.';
  if (/duplicate key|unique/i.test(m)) return 'Já existe um cadastro com esse nome.';
  if (/check constraint/i.test(m)) return 'Algum valor está fora do permitido. Confira os campos.';
  if (/row-level security|permission denied/i.test(m)) return 'Você não tem permissão para isso.';
  return m;
}

function CampoForm({ def: c, dados, aoMudar }: { def: DefCampo; dados: Record<string, unknown>; aoMudar: (nome: string, v: unknown) => void }) {
  const v = dados[c.nome];
  const opcoesExternas = useQuery({
    queryKey: ['opcoes', c.opcoesDe?.tabela],
    enabled: !!c.opcoesDe,
    queryFn: async () => {
      const { data, error } = await supabase.from(c.opcoesDe!.tabela).select(`id,${c.opcoesDe!.rotulo}`).order(c.opcoesDe!.rotulo);
      if (error) throw error;
      return (data as unknown as Record<string, string>[]).map((o) => ({ valor: o.id, rotulo: o[c.opcoesDe!.rotulo] }));
    },
  });
  const rotulo = c.rotulo + (c.obrigatorio ? ' *' : '');

  switch (c.tipo) {
    case 'areatexto':
      return (
        <Campo rotulo={rotulo} ajuda={c.ajuda ?? (c.max ? `${String(v ?? '').length}/${c.max}` : undefined)}>
          <AreaTexto value={String(v ?? '')} maxLength={c.max} onChange={(e) => aoMudar(c.nome, e.target.value)} />
        </Campo>
      );
    case 'numero':
      return (
        <Campo rotulo={rotulo} ajuda={c.ajuda}>
          <Entrada type="number" value={v == null ? '' : String(v)} onChange={(e) => aoMudar(c.nome, e.target.value)} />
        </Campo>
      );
    case 'booleano':
      return (
        <div className="campo" style={{ paddingTop: 8 }}>
          <Interruptor marcado={!!v} aoMudar={(x) => aoMudar(c.nome, x)} rotulo={c.rotulo} />
          {c.ajuda ? <small>{c.ajuda}</small> : null}
        </div>
      );
    case 'datahora':
      return (
        <Campo rotulo={rotulo} ajuda={c.ajuda ?? 'Horário de Brasília'}>
          <Entrada type="datetime-local" value={paraEntradaDataHora(v)} onChange={(e) => aoMudar(c.nome, deEntradaDataHora(e.target.value))} />
        </Campo>
      );
    case 'imagem':
      return (
        <Campo rotulo={rotulo} ajuda={c.ajuda}>
          <CampoImagem valor={(v as string) || null} aoMudar={(u) => aoMudar(c.nome, u)} pasta={c.pasta!} proporcao={c.proporcao ?? '16 / 9'} />
        </Campo>
      );
    case 'icone':
      return (
        <Campo rotulo={rotulo} ajuda={c.ajuda}>
          <SeletorIcone valor={(v as string) || null} aoMudar={(n) => aoMudar(c.nome, n)} />
        </Campo>
      );
    case 'cor':
      return (
        <Campo rotulo={rotulo} ajuda={c.ajuda ?? 'Prefira cores escuras: o texto em cima é branco.'}>
          <div className="linha">
            <input type="color" value={(v as string) || '#0B4A8F'} onChange={(e) => aoMudar(c.nome, e.target.value.toUpperCase())} style={{ width: 56, height: 42, border: 0, background: 'none', cursor: 'pointer' }} aria-label={c.rotulo} />
            <Entrada value={String(v ?? '')} onChange={(e) => aoMudar(c.nome, e.target.value)} placeholder="#0B4A8F" style={{ width: 140 }} />
          </div>
        </Campo>
      );
    case 'selecao': {
      const opcoes = c.opcoes ?? opcoesExternas.data ?? [];
      return (
        <Campo rotulo={rotulo} ajuda={c.ajuda}>
          <Selecao value={String(v ?? '')} onChange={(e) => aoMudar(c.nome, e.target.value)}>
            <option value="">— escolha —</option>
            {opcoes.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </Selecao>
        </Campo>
      );
    }
    case 'link':
      return (
        <Campo rotulo={rotulo} ajuda={c.ajuda ?? 'Tela do app (ex.: /servicos, /agenda) ou site começando com https://'}>
          <Entrada list="sugestoes-link" value={String(v ?? '')} onChange={(e) => aoMudar(c.nome, e.target.value)} placeholder="/servicos ou https://..." />
          <datalist id="sugestoes-link">
            {SUGESTOES_LINK.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Campo>
      );
    case 'coordenadas':
      return (
        <div className="pilha" style={{ gap: 8 }}>
          <Campo rotulo="Localização no mapa" ajuda="Cole o link do Google Maps do local (ou “-23.29, -50.07”) e as coordenadas são preenchidas.">
            <Entrada
              placeholder="Colar link do Google Maps"
              onChange={(e) => {
                const c2 = coordenadasDoLink(e.target.value);
                if (c2) {
                  aoMudar('latitude', c2.lat);
                  aoMudar('longitude', c2.lng);
                }
              }}
            />
          </Campo>
          <div className="grade grade-2">
            <Campo rotulo="Latitude">
              <Entrada type="number" step="any" value={dados.latitude == null ? '' : String(dados.latitude)} onChange={(e) => aoMudar('latitude', e.target.value)} />
            </Campo>
            <Campo rotulo="Longitude">
              <Entrada type="number" step="any" value={dados.longitude == null ? '' : String(dados.longitude)} onChange={(e) => aoMudar('longitude', e.target.value)} />
            </Campo>
          </div>
          {dados.latitude && dados.longitude ? (
            <a href={`https://www.google.com/maps?q=${dados.latitude},${dados.longitude}`} target="_blank" rel="noreferrer" className="pequeno">
              Conferir no Google Maps ↗
            </a>
          ) : null}
        </div>
      );
    default:
      return (
        <Campo rotulo={rotulo} ajuda={c.ajuda}>
          <Entrada value={String(v ?? '')} maxLength={c.max} onChange={(e) => aoMudar(c.nome, e.target.value)} />
        </Campo>
      );
  }
}
