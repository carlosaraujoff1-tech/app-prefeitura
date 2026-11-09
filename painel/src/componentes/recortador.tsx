import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Botao } from './ui';

// Recorte da foto antes de enviar: arraste para enquadrar e use o zoom.
// O recorte sai exatamente na proporção do campo (banner 2:1, aviso 16:9...).
export function lerProporcao(proporcao: string): number {
  const [a, b] = proporcao.split('/').map((n) => Number(n.trim()));
  return a > 0 && b > 0 ? a / b : 1;
}

export function Recortador({
  arquivo,
  proporcao,
  aoConfirmar,
  aoCancelar,
  aoSemRecorte,
}: {
  arquivo: File;
  proporcao: string;
  aoConfirmar: (recortado: Blob) => void;
  aoCancelar: () => void;
  aoSemRecorte: () => void;
}) {
  const razao = lerProporcao(proporcao);
  const largura = Math.min(520, 420 * razao);
  const altura = largura / razao;
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const arrasto = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);

  const base = natural ? Math.max(largura / natural.w, altura / natural.h) : 1;
  const escala = base * zoom;
  const limitar = (x: number, y: number, esc: number) =>
    natural
      ? { x: Math.min(0, Math.max(largura - natural.w * esc, x)), y: Math.min(0, Math.max(altura - natural.h * esc, y)) }
      : { x, y };

  function mudarZoom(novo: number) {
    if (!natural) return;
    const z = Math.min(4, Math.max(1, novo));
    const nova = base * z;
    const cx = (largura / 2 - pos.x) / escala;
    const cy = (altura / 2 - pos.y) / escala;
    setZoom(z);
    setPos(limitar(largura / 2 - cx * nova, altura / 2 - cy * nova, nova));
  }

  async function confirmar() {
    if (!natural || !url) return;
    const img = new Image();
    img.src = url;
    await img.decode();
    const sw = largura / escala;
    const sh = altura / escala;
    const fator = Math.min(1, 1600 / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * fator);
    canvas.height = Math.round(sh * fator);
    canvas.getContext('2d')?.drawImage(img, -pos.x / escala, -pos.y / escala, sw, sh, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/webp', 0.88));
    if (blob) aoConfirmar(blob);
  }

  return createPortal(
    <div className="modal-fundo" style={{ zIndex: 300 }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Recortar foto" style={{ maxWidth: largura + 48 }}>
        <div className="modal-cabecalho">
          <h2>Recortar foto ({proporcao.replace(/\s/g, '')})</h2>
        </div>
        <div className="modal-corpo" style={{ alignItems: 'center' }}>
          <div
            style={{ width: largura, height: altura, overflow: 'hidden', position: 'relative', background: '#222', borderRadius: 10, touchAction: 'none', cursor: 'grab' }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              arrasto.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y };
            }}
            onPointerMove={(e) => {
              const a = arrasto.current;
              if (a) setPos(limitar(a.x + e.clientX - a.px, a.y + e.clientY - a.py, escala));
            }}
            onPointerUp={() => (arrasto.current = null)}
            onWheel={(e) => mudarZoom(zoom - e.deltaY * 0.002)}>
            {url ? (
              <img
                src={url}
                alt=""
                draggable={false}
                onLoad={(e) => {
                  const n = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
                  const b = Math.max(largura / n.w, altura / n.h);
                  setNatural(n);
                  setPos({ x: (largura - n.w * b) / 2, y: (altura - n.h * b) / 2 });
                }}
                style={{ position: 'absolute', left: pos.x, top: pos.y, width: natural ? natural.w * escala : undefined, maxWidth: 'none', pointerEvents: 'none' }}
              />
            ) : null}
          </div>
          <label className="linha" style={{ justifyContent: 'center' }}>
            <span className="texto-2 pequeno">Zoom</span>
            <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => mudarZoom(Number(e.target.value))} style={{ width: 220 }} />
          </label>
          <p className="texto-2 pequeno centro">Arraste a foto para enquadrar. O que ficar dentro da moldura vai para o app.</p>
        </div>
        <div className="modal-rodape">
          <Botao variante="fantasma" onClick={aoSemRecorte} style={{ marginRight: 'auto' }}>
            Usar sem recortar
          </Botao>
          <Botao onClick={aoCancelar}>Cancelar</Botao>
          <Botao variante="primario" onClick={confirmar} disabled={!natural}>
            Recortar e usar
          </Botao>
        </div>
      </div>
    </div>,
    document.body,
  );
}
