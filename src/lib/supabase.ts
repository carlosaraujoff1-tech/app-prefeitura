import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const chave = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

// A sessão fica salva no próprio celular (o cidadão não precisa entrar toda vez).
export const supabase = createClient(url, chave, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renova o login só com o app aberto (economiza bateria).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
