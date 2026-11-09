import { useState } from 'react';

import { NOMES_ICONES } from '../lib/icones';
import { Entrada, Icone } from './ui';

export function SeletorIcone({ valor, aoMudar }: { valor: string | null; aoMudar: (n: string) => void }) {
  const [filtro, setFiltro] = useState('');
  const lista = NOMES_ICONES.filter((n) => n.includes(filtro.trim().toLowerCase()));
  return (
    <div className="pilha" style={{ gap: 8 }}>
      <div className="linha">
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--azul-claro)', display: 'grid', placeItems: 'center' }}>
          <Icone nome={valor} tamanho={28} cor="var(--azul)" />
        </div>
        <Entrada placeholder="Filtrar ícones (em inglês: water, road, school…)" value={filtro} onChange={(e) => setFiltro(e.target.value)} style={{ flex: 1 }} />
      </div>
      <div className="icones-grade" role="listbox" aria-label="Ícones">
        {lista.map((n) => (
          <button key={n} type="button" title={n} className={n === valor ? 'ativo' : ''} onClick={() => aoMudar(n)} role="option" aria-selected={n === valor}>
            <Icone nome={n} tamanho={26} />
          </button>
        ))}
      </div>
    </div>
  );
}
