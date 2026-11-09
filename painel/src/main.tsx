import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { AvisosProvider } from './componentes/avisos';
import { SessaoProvider } from './lib/sessao';
import './estilos.css';

const cliente = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } } });

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <AvisosProvider>
        <SessaoProvider>
          <App />
        </SessaoProvider>
      </AvisosProvider>
    </QueryClientProvider>
  </StrictMode>,
);
