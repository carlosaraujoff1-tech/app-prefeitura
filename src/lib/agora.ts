import { useEffect, useState } from 'react';

// Hora atual que se atualiza sozinha a cada minuto (para "já passou?" em eventos).
export function useAgora() {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  return agora;
}
