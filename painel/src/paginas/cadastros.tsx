// Telas de cadastro do conteúdo do app. Todas usam o componente <Cadastro>.
import { dataCurta, dataHora } from '@/lib/formatar';

import { Cadastro, type Linha } from '../componentes/cadastro';
import { Caixa, Icone } from '../componentes/ui';

const txt = (v: unknown) => (v == null ? '' : String(v));
const Miniatura = ({ url, icone, cor }: { url?: unknown; icone?: unknown; cor?: unknown }) =>
  url ? (
    <img src={String(url)} alt="" style={{ width: 64, height: 40, objectFit: 'cover', borderRadius: 6 }} />
  ) : (
    <div style={{ width: 40, height: 40, borderRadius: 10, background: cor ? String(cor) : 'var(--azul-claro)', display: 'grid', placeItems: 'center' }}>
      <Icone nome={txt(icone) || 'information-outline'} cor={cor ? '#fff' : 'var(--azul)'} />
    </div>
  );
const Titulo = ({ l, a, b }: { l: Linha; a: string; b?: string }) => (
  <div>
    <div className="forte">{txt(l[a])}</div>
    {b && l[b] ? (
      <div className="texto-2 pequeno" style={{ maxWidth: 520, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {txt(l[b])}
      </div>
    ) : null}
  </div>
);

export const Avisos = () => (
  <Cadastro
    tabela="avisos"
    titulo="Avisos"
    singular="aviso"
    descricao="Comunicados da Prefeitura que aparecem na tela inicial do app."
    ordem={[{ coluna: 'fixado', asc: false }, { coluna: 'publicado_em', asc: false }]}
    textoBusca={(l) => `${txt(l.titulo)} ${txt(l.resumo)}`}
    colunas={[
      { titulo: 'Aviso', render: (l) => <Titulo l={l} a="titulo" b="resumo" /> },
      { titulo: 'Publicado', render: (l) => dataHora(txt(l.publicado_em)), largura: 170 },
      { titulo: 'Fixado', render: (l) => (l.fixado ? '📌 Sim' : '—'), largura: 90 },
    ]}
    campos={[
      { nome: 'titulo', rotulo: 'Título', tipo: 'texto', obrigatorio: true, max: 120 },
      { nome: 'resumo', rotulo: 'Resumo (aparece na lista)', tipo: 'areatexto', obrigatorio: true, max: 300 },
      { nome: 'conteudo', rotulo: 'Texto completo (opcional)', tipo: 'areatexto', max: 5000 },
      { nome: 'imagem_url', rotulo: 'Imagem (opcional)', tipo: 'imagem', pasta: 'avisos', proporcao: '16 / 9' },
      { nome: 'link', rotulo: 'Link “Saiba mais” (opcional)', tipo: 'link' },
      { nome: 'publicado_em', rotulo: 'Publicar em', tipo: 'datahora', meia: true, ajuda: 'Vazio = agora. Data futura = agenda a publicação.' },
      { nome: 'expira_em', rotulo: 'Sai do app em (opcional)', tipo: 'datahora', meia: true },
      { nome: 'fixado', rotulo: 'Fixar no topo', tipo: 'booleano' },
    ]}
  />
);

export const Noticias = () => (
  <Cadastro
    tabela="noticias"
    titulo="Notícias"
    singular="notícia"
    descricao="Notícias da Prefeitura (tela Notícias e tela inicial do app)."
    ordem={[{ coluna: 'publicado_em', asc: false }]}
    textoBusca={(l) => `${txt(l.titulo)} ${txt(l.resumo)}`}
    colunas={[
      { titulo: '', render: (l) => <Miniatura url={l.imagem_url} icone="newspaper-variant-outline" />, largura: 80 },
      { titulo: 'Notícia', render: (l) => <Titulo l={l} a="titulo" b="resumo" /> },
      { titulo: 'Publicada', render: (l) => dataCurta(txt(l.publicado_em)), largura: 120 },
    ]}
    campos={[
      { nome: 'titulo', rotulo: 'Título', tipo: 'texto', obrigatorio: true, max: 140 },
      { nome: 'resumo', rotulo: 'Resumo', tipo: 'areatexto', max: 300 },
      { nome: 'conteudo', rotulo: 'Texto da notícia', tipo: 'areatexto', obrigatorio: true, max: 20000 },
      { nome: 'imagem_url', rotulo: 'Foto', tipo: 'imagem', pasta: 'noticias', proporcao: '16 / 9' },
      { nome: 'publicado_em', rotulo: 'Publicar em', tipo: 'datahora', ajuda: 'Vazio = agora.' },
    ]}
  />
);

export const Banners = () => (
  <Cadastro
    tabela="banners"
    titulo="Banners"
    singular="banner"
    descricao="Cartões que deslizam na tela inicial. Com foto (2:1) ou cartão colorido com ícone."
    ordem={[{ coluna: 'ordem' }, { coluna: 'criado_em', asc: false }]}
    textoBusca={(l) => `${txt(l.titulo)} ${txt(l.descricao)}`}
    colunas={[
      { titulo: '', render: (l) => <Miniatura url={l.imagem_url} icone={l.icone} cor={l.cor} />, largura: 80 },
      { titulo: 'Banner', render: (l) => <Titulo l={l} a="titulo" b="descricao" /> },
      { titulo: 'Leva para', render: (l) => txt(l.link) || '—', largura: 160 },
      { titulo: 'Ordem', render: (l) => txt(l.ordem), largura: 70 },
    ]}
    campos={[
      { nome: 'titulo', rotulo: 'Título', tipo: 'texto', obrigatorio: true, max: 60 },
      { nome: 'descricao', rotulo: 'Texto curto', tipo: 'areatexto', max: 140 },
      { nome: 'imagem_url', rotulo: 'Foto (opcional — sem foto vira cartão colorido)', tipo: 'imagem', pasta: 'banners', proporcao: '2 / 1' },
      { nome: 'cor', rotulo: 'Cor do cartão', tipo: 'cor', meia: true, padrao: '#0B4A8F' },
      { nome: 'ordem', rotulo: 'Ordem (menor aparece primeiro)', tipo: 'numero', meia: true, padrao: 0 },
      { nome: 'icone', rotulo: 'Ícone', tipo: 'icone' },
      { nome: 'link', rotulo: 'Ao tocar, abrir', tipo: 'link' },
      { nome: 'inicio_em', rotulo: 'Mostrar a partir de (opcional)', tipo: 'datahora', meia: true },
      { nome: 'fim_em', rotulo: 'Mostrar até (opcional)', tipo: 'datahora', meia: true },
    ]}
  />
);

export const Eventos = () => (
  <Cadastro
    tabela="eventos"
    titulo="Agenda"
    singular="evento"
    descricao="Eventos e campanhas. O cidadão pode ativar um lembrete; se você mudar o horário, o lembrete acompanha."
    select="*,categoria:categorias_evento(nome,cor,icone)"
    ordem={[{ coluna: 'inicio_em', asc: false }]}
    textoBusca={(l) => `${txt(l.titulo)} ${txt(l.local_nome)}`}
    colunas={[
      {
        titulo: '',
        render: (l) => {
          const c = l.categoria as { cor: string; icone: string } | null;
          return <Miniatura url={l.imagem_url} icone={c?.icone ?? 'calendar'} cor={c?.cor} />;
        },
        largura: 80,
      },
      { titulo: 'Evento', render: (l) => <Titulo l={l} a="titulo" b="local_nome" /> },
      { titulo: 'Categoria', render: (l) => (l.categoria as { nome: string } | null)?.nome ?? '—', largura: 130 },
      { titulo: 'Quando', render: (l) => dataHora(txt(l.inicio_em)), largura: 170 },
    ]}
    validar={(d) => (d.fim_em && d.inicio_em && String(d.fim_em) < String(d.inicio_em) ? 'O fim deve ser depois do início.' : null)}
    campos={[
      { nome: 'titulo', rotulo: 'Nome do evento', tipo: 'texto', obrigatorio: true, max: 120 },
      { nome: 'categoria_id', rotulo: 'Categoria', tipo: 'selecao', meia: true, opcoesDe: { tabela: 'categorias_evento', rotulo: 'nome' } },
      { nome: 'local_nome', rotulo: 'Local', tipo: 'texto', meia: true, max: 120 },
      { nome: 'inicio_em', rotulo: 'Começa em', tipo: 'datahora', obrigatorio: true, meia: true },
      { nome: 'fim_em', rotulo: 'Termina em', tipo: 'datahora', meia: true },
      { nome: 'descricao', rotulo: 'Descrição', tipo: 'areatexto', max: 3000 },
      { nome: 'imagem_url', rotulo: 'Foto (opcional)', tipo: 'imagem', pasta: 'eventos', proporcao: '16 / 9' },
    ]}
  />
);

export const Servicos = () => (
  <Cadastro
    tabela="servicos"
    titulo="Serviços"
    singular="serviço"
    descricao="Lista da aba Serviços. Cada serviço abre um site ou uma solicitação no app."
    select="*,tipo:tipos_solicitacao(nome)"
    ordem={[{ coluna: 'ordem' }, { coluna: 'nome' }]}
    textoBusca={(l) => `${txt(l.nome)} ${txt(l.descricao)} ${txt(l.categoria)}`}
    colunas={[
      { titulo: '', render: (l) => <Miniatura icone={l.icone} />, largura: 60 },
      { titulo: 'Serviço', render: (l) => <Titulo l={l} a="nome" b="descricao" /> },
      { titulo: 'Categoria', render: (l) => txt(l.categoria) || '—', largura: 120 },
      {
        titulo: 'Abre',
        render: (l) => ((l.tipo as { nome: string } | null)?.nome ? `Solicitação: ${(l.tipo as { nome: string }).nome}` : l.link_externo ? 'Site' : '—'),
        largura: 170,
      },
      { titulo: 'Destaque', render: (l) => (l.destaque ? '⭐' : ''), largura: 80 },
    ]}
    validar={(d) =>
      !d.link_externo && !d.tipo_solicitacao_id && !d.descricao
        ? 'Informe um link, um tipo de solicitação ou uma descrição.'
        : d.link_externo && !/^https?:\/\//.test(String(d.link_externo))
          ? 'O link precisa começar com https://'
          : null
    }
    campos={[
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, max: 60 },
      { nome: 'categoria', rotulo: 'Categoria', tipo: 'texto', meia: true, ajuda: 'Ex.: Tributos, Saúde, Empresas' },
      { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', meia: true, padrao: 0 },
      { nome: 'descricao', rotulo: 'Descrição', tipo: 'areatexto', max: 600 },
      { nome: 'link_externo', rotulo: 'Site do serviço', tipo: 'texto', ajuda: 'Começando com https://' },
      { nome: 'tipo_solicitacao_id', rotulo: 'Ou abrir solicitação do tipo', tipo: 'selecao', opcoesDe: { tabela: 'tipos_solicitacao', rotulo: 'nome' } },
      { nome: 'icone', rotulo: 'Ícone', tipo: 'icone', obrigatorio: true },
      { nome: 'destaque', rotulo: 'Destaque (aparece primeiro)', tipo: 'booleano' },
    ]}
  />
);

const CATEGORIAS_LOCAL = [
  ['administracao', 'Prefeitura / administração'], ['saude', 'Saúde'], ['seguranca', 'Segurança'], ['emergencia', 'Emergência (só telefone)'],
  ['educacao', 'Educação'], ['assistencia', 'Assistência Social'], ['cultura', 'Cultura'], ['esporte', 'Esporte'],
  ['servicos', 'Serviços'], ['justica', 'Justiça'], ['transporte', 'Transporte'], ['outros', 'Outros'],
].map(([valor, rotulo]) => ({ valor, rotulo }));

export const Locais = () => (
  <Cadastro
    tabela="locais"
    titulo="Locais e telefones"
    singular="local"
    descricao="Aparecem em “Locais da cidade” (os que têm endereço) e em “Telefones úteis” (os que têm telefone)."
    ordem={[{ coluna: 'ordem' }, { coluna: 'nome' }]}
    textoBusca={(l) => `${txt(l.nome)} ${txt(l.endereco)} ${txt(l.telefone)}`}
    aviso={<Caixa tipo="alerta">Locais com “(confirmar)” no nome vieram incompletos do Bubble: corrija o nome e o telefone.</Caixa>}
    colunas={[
      { titulo: 'Local', render: (l) => <Titulo l={l} a="nome" b="endereco" /> },
      { titulo: 'Categoria', render: (l) => CATEGORIAS_LOCAL.find((c) => c.valor === l.categoria)?.rotulo ?? txt(l.categoria), largura: 170 },
      { titulo: 'Telefone', render: (l) => txt(l.telefone) || '—', largura: 140 },
      { titulo: 'Mapa', render: (l) => (l.latitude != null ? '✓' : '—'), largura: 70 },
    ]}
    campos={[
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, max: 100 },
      { nome: 'categoria', rotulo: 'Categoria', tipo: 'selecao', obrigatorio: true, meia: true, opcoes: CATEGORIAS_LOCAL, padrao: 'outros' },
      { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', meia: true, padrao: 0 },
      { nome: 'telefone', rotulo: 'Telefone', tipo: 'texto', meia: true },
      { nome: 'whatsapp', rotulo: 'WhatsApp', tipo: 'texto', meia: true },
      { nome: 'endereco', rotulo: 'Endereço', tipo: 'texto' },
      { nome: 'horario', rotulo: 'Horário de funcionamento', tipo: 'texto', ajuda: 'Ex.: Seg a sex, 8h às 17h' },
      { nome: 'descricao', rotulo: 'O que é atendido aqui', tipo: 'areatexto', max: 500 },
      { nome: 'latitude', rotulo: 'Localização', tipo: 'coordenadas' },
      { nome: 'telefone_util', rotulo: 'Mostrar em “Telefones úteis”', tipo: 'booleano', padrao: true },
    ]}
  />
);

export const Tipos = () => (
  <Cadastro
    tabela="tipos_solicitacao"
    titulo="Tipos de solicitação"
    singular="tipo"
    descricao="O que o cidadão pode pedir no app e qual secretaria atende cada tipo."
    select="*,secretaria:secretarias(nome)"
    ordem={[{ coluna: 'ordem' }, { coluna: 'nome' }]}
    textoBusca={(l) => `${txt(l.nome)} ${txt(l.descricao)}`}
    colunas={[
      { titulo: '', render: (l) => <Miniatura icone={l.icone} />, largura: 60 },
      { titulo: 'Tipo', render: (l) => <Titulo l={l} a="nome" b="descricao" /> },
      { titulo: 'Secretaria', render: (l) => (l.secretaria as { nome: string } | null)?.nome ?? '—', largura: 200 },
      { titulo: 'Prazo', render: (l) => (l.prazo_dias ? `${txt(l.prazo_dias)} dias` : '—'), largura: 90 },
    ]}
    campos={[
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, max: 60 },
      { nome: 'descricao', rotulo: 'Explicação curta (ajuda o cidadão a escolher)', tipo: 'texto', max: 120 },
      { nome: 'secretaria_id', rotulo: 'Secretaria responsável', tipo: 'selecao', obrigatorio: true, meia: true, opcoesDe: { tabela: 'secretarias', rotulo: 'nome' } },
      { nome: 'prazo_dias', rotulo: 'Prazo para resolver (dias)', tipo: 'numero', meia: true, ajuda: 'Opcional. Mostrado ao cidadão.' },
      { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', meia: true, padrao: 0 },
      { nome: 'icone', rotulo: 'Ícone', tipo: 'icone', obrigatorio: true },
      { nome: 'exige_localizacao', rotulo: 'Exigir endereço ou localização', tipo: 'booleano', padrao: true },
      { nome: 'exige_foto', rotulo: 'Exigir pelo menos 1 foto', tipo: 'booleano' },
    ]}
  />
);

export const Secretarias = () => (
  <Cadastro
    tabela="secretarias"
    titulo="Secretarias"
    singular="secretaria"
    descricao="Cada servidor pertence a uma secretaria e só vê as solicitações dela."
    ordem={[{ coluna: 'ordem' }, { coluna: 'nome' }]}
    textoBusca={(l) => `${txt(l.nome)} ${txt(l.sigla)}`}
    colunas={[
      { titulo: 'Secretaria', render: (l) => <Titulo l={l} a="nome" b="sigla" /> },
      { titulo: 'Telefone', render: (l) => txt(l.telefone) || '—', largura: 160 },
      { titulo: 'E-mail', render: (l) => txt(l.email) || '—', largura: 240 },
    ]}
    campos={[
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
      { nome: 'sigla', rotulo: 'Sigla', tipo: 'texto', meia: true },
      { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', meia: true, padrao: 0 },
      { nome: 'telefone', rotulo: 'Telefone', tipo: 'texto', meia: true },
      { nome: 'email', rotulo: 'E-mail', tipo: 'texto', meia: true },
    ]}
  />
);

export const Bairros = () => (
  <Cadastro
    tabela="bairros"
    titulo="Bairros"
    singular="bairro"
    descricao="Lista de bairros oferecida no cadastro e na abertura de solicitações."
    ordem={[{ coluna: 'ordem' }, { coluna: 'nome' }]}
    textoBusca={(l) => txt(l.nome)}
    colunas={[
      { titulo: 'Bairro', render: (l) => <span className="forte">{txt(l.nome)}</span> },
      { titulo: 'Ordem', render: (l) => txt(l.ordem), largura: 90 },
    ]}
    campos={[
      { nome: 'nome', rotulo: 'Nome do bairro', tipo: 'texto', obrigatorio: true },
      { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', padrao: 0 },
    ]}
  />
);

export const CategoriasEvento = () => (
  <Cadastro
    tabela="categorias_evento"
    titulo="Categorias da agenda"
    singular="categoria"
    descricao="Cor e ícone das bolinhas e cartões da agenda."
    ordem={[{ coluna: 'ordem' }, { coluna: 'nome' }]}
    textoBusca={(l) => txt(l.nome)}
    colunas={[
      { titulo: '', render: (l) => <Miniatura icone={l.icone} cor={l.cor} />, largura: 60 },
      { titulo: 'Categoria', render: (l) => <Titulo l={l} a="nome" b="descricao" /> },
    ]}
    campos={[
      { nome: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true, meia: true },
      { nome: 'cor', rotulo: 'Cor', tipo: 'cor', obrigatorio: true, meia: true, padrao: '#0B4A8F' },
      { nome: 'descricao', rotulo: 'Descrição', tipo: 'texto' },
      { nome: 'ordem', rotulo: 'Ordem', tipo: 'numero', padrao: 0 },
      { nome: 'icone', rotulo: 'Ícone', tipo: 'icone', obrigatorio: true },
    ]}
  />
);
