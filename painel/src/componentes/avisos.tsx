import { createContext, type ReactNode, use, useCallback, useState } from 'react';

type Tipo = 'info' | 'sucesso' | 'erro';
const Contexto = createContext<(texto: string, tipo?: Tipo) => void>(() => {});

// Mensagens rápidas no canto da tela ("Salvo!", "Erro ao salvar").
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<{ id: number; texto: string; tipo: Tipo }[]>([]);
  const avisar = useCallback((texto: string, tipo: Tipo = 'info') => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l, { id, texto, tipo }]);
    setTimeout(() => setLista((l) => l.filter((a) => a.id !== id)), tipo === 'erro' ? 7000 : 3500);
  }, []);
  return (
    <Contexto value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {lista.map((a) => (
          <div key={a.id} className={`aviso ${a.tipo}`}>
            {a.texto}
          </div>
        ))}
      </div>
    </Contexto>
  );
}

export const useAvisar = () => use(Contexto);
