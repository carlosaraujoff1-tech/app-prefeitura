import { mdiDeleteOutline, mdiImagePlus, mdiUpload } from '@mdi/js';
import { useRef, useState } from 'react';

import { mensagemErro } from '@/lib/erros';

import { enviarImagem, type PastaImagem } from '../lib/imagens';
import { useAvisar } from './avisos';
import { Recortador } from './recortador';
import { Botao, Icone } from './ui';

// Foto: escolher/arrastar → recortar na proporção → reduzir + WebP → enviar.
export function CampoImagem({
  valor,
  aoMudar,
  pasta,
  proporcao,
}: {
  valor: string | null;
  aoMudar: (url: string | null) => void;
  pasta: PastaImagem;
  proporcao: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [aRecortar, setARecortar] = useState<File | null>(null);
  const avisar = useAvisar();

  function escolher(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith('image/')) return avisar('Escolha uma imagem (JPG, PNG ou WebP).', 'erro');
    setARecortar(f);
  }

  async function enviar(b: Blob) {
    setEnviando(true);
    try {
      aoMudar(await enviarImagem(b, pasta));
    } catch (e) {
      avisar(mensagemErro(e), 'erro');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pilha" style={{ gap: 8 }}>
      <div
        className={`zona-arquivo ${sobre ? 'sobre' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Escolher foto"
        style={{ width: '100%', maxWidth: 420, aspectRatio: proporcao, overflow: 'hidden', display: 'grid', placeItems: 'center' }}
        onClick={() => entrada.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && entrada.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSobre(true);
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSobre(false);
          escolher(e.dataTransfer.files[0]);
        }}>
        {enviando ? (
          <span className="girando" />
        ) : valor ? (
          <img src={valor} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span className="texto-2 pequeno pilha" style={{ alignItems: 'center', gap: 6 }}>
            <Icone d={mdiImagePlus} tamanho={30} cor="var(--azul)" />
            Clique ou arraste uma foto (proporção {proporcao.replace(/\s/g, '')})
          </span>
        )}
      </div>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          escolher(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="linha">
        <Botao pequeno icone={mdiUpload} onClick={() => entrada.current?.click()} carregando={enviando}>
          {valor ? 'Trocar foto' : 'Enviar foto'}
        </Botao>
        {valor ? (
          <Botao pequeno variante="perigo" icone={mdiDeleteOutline} onClick={() => aoMudar(null)}>
            Remover
          </Botao>
        ) : null}
      </div>
      {aRecortar ? (
        <Recortador
          arquivo={aRecortar}
          proporcao={proporcao}
          aoCancelar={() => setARecortar(null)}
          aoSemRecorte={() => {
            const f = aRecortar;
            setARecortar(null);
            enviar(f);
          }}
          aoConfirmar={(b) => {
            setARecortar(null);
            enviar(b);
          }}
        />
      ) : null}
    </div>
  );
}
