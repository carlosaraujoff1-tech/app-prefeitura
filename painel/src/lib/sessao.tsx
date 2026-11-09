import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, use, useEffect, useState } from 'react';

import { supabase } from './supabase';

export type PerfilEquipe = {
  id: string;
  nome: string;
  email: string | null;
  tipo: 'cidadao' | 'servidor' | 'admin';
  secretaria_id: string | null;
  ativo: boolean;
  secretaria: { nome: string } | null;
};

type Sessao = {
  carregando: boolean;
  sessao: Session | null;
  perfil: PerfilEquipe | null;
  ehAdmin: boolean;
  entrar: (cpf: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
};

const Contexto = createContext<Sessao | null>(null);

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s);
      if (evento === 'INITIAL_SESSION') setCarregando(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = sessao?.user.id;
  const perfil = useQuery({
    queryKey: ['meu-perfil', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis')
        .select('id,nome,email,tipo,secretaria_id,ativo,secretaria:secretarias(nome)')
        .eq('id', uid!)
        .single();
      if (error) throw error;
      return data as unknown as PerfilEquipe;
    },
  });

  const valor: Sessao = {
    carregando: carregando || (!!uid && perfil.isPending),
    sessao,
    perfil: perfil.data ?? null,
    ehAdmin: perfil.data?.tipo === 'admin' && perfil.data.ativo,
    async entrar(cpf, senha) {
      // Mesmo login do app (CPF + senha), feito no servidor com limite de tentativas.
      const { data, error } = await supabase.functions.invoke('entrar', { body: { cpf: cpf.replace(/\D/g, ''), senha } });
      if (error) {
        let msg = 'Não foi possível entrar. Verifique a internet.';
        try {
          const corpo = await (error as { context?: Response }).context?.json();
          if (corpo?.erro) msg = corpo.erro;
        } catch {}
        throw new Error(msg);
      }
      const r = await supabase.auth.setSession(data as { access_token: string; refresh_token: string });
      if (r.error) throw r.error;
    },
    async sair() {
      await supabase.auth.signOut();
      qc.clear();
    },
  };
  return <Contexto value={valor}>{children}</Contexto>;
}

export function useSessao() {
  const c = use(Contexto);
  if (!c) throw new Error('useSessao fora do SessaoProvider');
  return c;
}
