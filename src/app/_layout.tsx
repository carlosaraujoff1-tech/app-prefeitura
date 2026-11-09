import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Cores } from '@/constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Cores.primaria },
          headerTintColor: Cores.branco,
          contentStyle: { backgroundColor: Cores.fundo },
        }}
      />
    </>
  );
}
