import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';

import './supabase'; // garante o localStorage (expo-sqlite) instalado

// Cache: o app abre mostrando o que já tinha (rápido e funciona sem internet)
// e atualiza em segundo plano.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export const persister = createSyncStoragePersister({
  storage: globalThis.localStorage,
  key: 'sap-cidadao-cache-v1',
  throttleTime: 2000,
});
