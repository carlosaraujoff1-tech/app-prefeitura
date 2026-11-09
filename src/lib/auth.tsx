import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, use, useEffect, useState } from 'react';

import { buscarPerfil, type Perfil } from './api';
import { soDigitos } from './formatar';
import { supabase } from './supabase';

type Auth = {
  carregando: boolean;
  sessao: Session | null;
  usuarioId: string | null;
  perfil: Perfil | null;
  entrar: (cpf: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
};

const Contexto = createContext<Auth | null>(null);

// Lê a mensagem de erro que as nossas Edge Functions devolvem ({ erro: "..." }).
async function erroDaFuncao(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const corpo = await ctx.json();
      if (corpo?.erro) return String(corpo.erro);
    } catch {}
  }
  return 'Não foi possível conectar. Verifique sua internet e tente de novo.';
}

export async function chamarFuncao<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(nome, { body: corpo });
  if (error) throw new Error(await erroDaFuncao(error));
  return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    // INITIAL_SESSION chega depois que a sessão salva no aparelho foi lida.
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s);
      if (evento === 'INITIAL_SESSION') setCarregando(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const usuarioId = sessao?.user.id ?? null;
  const { data: perfil } = useQuery({
    queryKey: ['perfil', usuarioId],
    queryFn: () => buscarPerfil(usuarioId!),
    enabled: !!usuarioId,
  });

  useEffect(() => {
    if (usuarioId) supabase.rpc('registrar_acesso').then(() => {});
  }, [usuarioId]);

  const valor: Auth = {
    carregando,
    sessao,
    usuarioId,
    perfil: usuarioId ? (perfil ?? null) : null,
    async entrar(cpf, senha) {
      const tokens = await chamarFuncao<{ access_token: string; refresh_token: string }>('entrar', {
        cpf: soDigitos(cpf),
        senha,
      });
      const { error } = await supabase.auth.setSession(tokens);
      if (error) throw error;
    },
    async sair() {
      await supabase.auth.signOut();
      qc.removeQueries({ queryKey: ['perfil'] });
      qc.removeQueries({ queryKey: ['minhas-solicitacoes'] });
      qc.removeQueries({ queryKey: ['notificacoes'] });
      qc.removeQueries({ queryKey: ['nao-lidas'] });
      qc.removeQueries({ queryKey: ['lembretes'] });
    },
  };

  return <Contexto value={valor}>{children}</Contexto>;
}

export function useAuth() {
  const c = use(Contexto);
  if (!c) throw new Error('useAuth fora do AuthProvider');
  return c;
}
