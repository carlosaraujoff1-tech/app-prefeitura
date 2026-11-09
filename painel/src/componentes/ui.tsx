import { mdiAlertCircleOutline, mdiCheckCircleOutline, mdiClose, mdiInformationOutline, mdiMagnify } from '@mdi/js';
import type { ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cloneElement, isValidElement, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

import { ICONES } from '../lib/icones';
import { STATUS, type Status } from '../lib/status';

// Ícone SVG (aceita o "path" do @mdi/js ou um nome da lista de ícones).
export function Icone({ d, nome, tamanho = 22, cor = 'currentColor', estilo }: { d?: string; nome?: string | null; tamanho?: number; cor?: string; estilo?: CSSProperties }) {
  const caminho = d ?? (nome ? ICONES[nome] : undefined) ?? ICONES['information-outline'];
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, ...estilo }}>
      <path d={caminho} fill={cor} />
    </svg>
  );
}

export function Botao({
  variante,
  pequeno,
  carregando,
  icone,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'perigo' | 'fantasma'; pequeno?: boolean; carregando?: boolean; icone?: string }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || carregando}
      className={['botao', variante, pequeno && 'pequeno', className].filter(Boolean).join(' ')}>
      {carregando ? <span className="girando" /> : icone ? <Icone d={icone} tamanho={pequeno ? 18 : 20} /> : null}
      {children}
    </button>
  );
}

export function Campo({ rotulo, ajuda, erro, children }: { rotulo: string; ajuda?: ReactNode; erro?: string | null; children: ReactNode }) {
  const idGerado = useId();
  // Liga o rótulo ao campo (leitor de tela e clique no rótulo).
  const unico = isValidElement<{ id?: string }>(children) && typeof children.type === 'function' ? children : null;
  const id = unico ? (unico.props.id ?? idGerado) : undefined;
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      {unico ? cloneElement(unico, { id }) : children}
      {erro ? <span className="erro">{erro}</span> : ajuda ? <small>{ajuda}</small> : null}
    </div>
  );
}

export const Entrada = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`entrada ${p.className ?? ''}`} />;
export const AreaTexto = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`entrada ${p.className ?? ''}`} />;
export const Selecao = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={`entrada ${p.className ?? ''}`} />;

export function Busca({ valor, aoMudar, placeholder }: { valor: string; aoMudar: (v: string) => void; placeholder: string }) {
  return (
    <div className="busca" style={{ flex: 1, minWidth: 220 }}>
      <Icone d={mdiMagnify} tamanho={20} />
      <Entrada value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

export function Interruptor({ marcado, aoMudar, rotulo }: { marcado: boolean; aoMudar: (v: boolean) => void; rotulo: string }) {
  return (
    <label className="interruptor">
      <input type="checkbox" checked={marcado} onChange={(e) => aoMudar(e.target.checked)} />
      <span className="trilho" />
      {rotulo}
    </label>
  );
}

export function Etiqueta({ texto, cor, fundo, icone }: { texto: string; cor: string; fundo: string; icone?: string }) {
  return (
    <span className="etiqueta" style={{ color: cor, background: fundo }}>
      {icone ? <Icone d={icone} tamanho={15} /> : null}
      {texto}
    </span>
  );
}

export function EtiquetaStatus({ status }: { status: Status }) {
  const s = STATUS[status];
  return <Etiqueta texto={s.rotulo} cor={s.cor} fundo={s.fundo} icone={s.icone} />;
}

export function Caixa({ tipo = 'info', children }: { tipo?: 'info' | 'alerta' | 'erro' | 'sucesso'; children: ReactNode }) {
  const m = {
    info: { d: mdiInformationOutline, cor: 'var(--azul)' },
    alerta: { d: mdiAlertCircleOutline, cor: 'var(--laranja)' },
    erro: { d: mdiAlertCircleOutline, cor: 'var(--vermelho)' },
    sucesso: { d: mdiCheckCircleOutline, cor: 'var(--verde)' },
  }[tipo];
  return (
    <div className={`caixa ${tipo}`}>
      <Icone d={m.d} cor={m.cor} />
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

export function Modal({ titulo, aoFechar, children, rodape, largura = 680 }: { titulo: string; aoFechar: () => void; children: ReactNode; rodape?: ReactNode; largura?: number }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoFechar]);
  return createPortal(
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: largura }}>
        <div className="modal-cabecalho">
          <h2>{titulo}</h2>
          <Botao variante="fantasma" pequeno icone={mdiClose} onClick={aoFechar} aria-label="Fechar" />
        </div>
        <div className="modal-corpo">{children}</div>
        {rodape ? <div className="modal-rodape">{rodape}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div className="vazio" role="status">
      <span className="girando" style={{ width: 28, height: 28, color: 'var(--azul)' }} />
      {texto}
    </div>
  );
}

export function Vazio({ icone, titulo, texto, children }: { icone: string; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="vazio">
      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--azul-claro)', display: 'grid', placeItems: 'center' }}>
        <Icone d={icone} tamanho={32} cor="var(--azul)" />
      </div>
      <h3 style={{ color: 'var(--texto)' }}>{titulo}</h3>
      {texto ? <p>{texto}</p> : null}
      {children}
    </div>
  );
}

export function Cabecalho({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="cabecalho">
      <div>
        <h1>{titulo}</h1>
        {texto ? <p>{texto}</p> : null}
      </div>
      {children ? <div className="linha">{children}</div> : null}
    </div>
  );
}

export function Numero({ icone, cor, fundo, valor, rotulo, href }: { icone: string; cor: string; fundo: string; valor: ReactNode; rotulo: string; href?: string }) {
  const corpo = (
    <>
      <div className="icone-caixa" style={{ background: fundo }}>
        <Icone d={icone} cor={cor} tamanho={26} />
      </div>
      <div>
        <strong>{valor}</strong>
        <span>{rotulo}</span>
      </div>
    </>
  );
  return href ? (
    <a className="cartao numero" href={href}>
      {corpo}
    </a>
  ) : (
    <div className="cartao numero">{corpo}</div>
  );
}

export function confirmar(texto: string) {
  return window.confirm(texto);
}
