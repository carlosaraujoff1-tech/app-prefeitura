import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Cores, Fonte } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { persister, queryClient } from '@/lib/query';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navegacao() {
  const { carregando } = useAuth();
  useEffect(() => {
    if (!carregando) SplashScreen.hideAsync().catch(() => {});
  }, [carregando]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Cores.primaria },
        headerTintColor: Cores.branco,
        headerTitleStyle: { fontWeight: '700', fontSize: Fonte.media },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: Cores.fundo },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Início' }} />
      <Stack.Screen name="entrar" options={{ title: 'Entrar', presentation: 'modal' }} />
      <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
      <Stack.Screen name="esqueci-senha" options={{ title: 'Esqueci minha senha' }} />
      <Stack.Screen name="redefinir-senha" options={{ title: 'Nova senha' }} />
      <Stack.Screen name="editar-perfil" options={{ title: 'Meus dados' }} />
      <Stack.Screen name="solicitacoes/nova" options={{ title: 'Nova solicitação' }} />
      <Stack.Screen name="solicitacoes/[id]" options={{ title: 'Solicitação' }} />
      <Stack.Screen name="servicos/[id]" options={{ title: 'Serviço' }} />
      <Stack.Screen name="agenda/[id]" options={{ title: 'Evento' }} />
      <Stack.Screen name="avisos/index" options={{ title: 'Avisos da Prefeitura' }} />
      <Stack.Screen name="avisos/[id]" options={{ title: 'Aviso' }} />
      <Stack.Screen name="noticias/index" options={{ title: 'Notícias' }} />
      <Stack.Screen name="noticias/[id]" options={{ title: 'Notícia' }} />
      <Stack.Screen name="locais" options={{ title: 'Locais da cidade' }} />
      <Stack.Screen name="telefones" options={{ title: 'Telefones úteis' }} />
      <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
      <Stack.Screen name="privacidade" options={{ title: 'Privacidade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1000, buster: 'v1' }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Navegacao />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
