import { createClient } from '@supabase/supabase-js';

// Chaves PÚBLICAS (as mesmas do app). A segurança está no banco (RLS).
export const supabase = createClient(
  import.meta.env.EXPO_PUBLIC_SUPABASE_URL as string,
  import.meta.env.EXPO_PUBLIC_SUPABASE_KEY as string,
  { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sap-painel-sessao' } },
);
