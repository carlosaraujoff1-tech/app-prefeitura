import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from '@/components/icone';
import { Cores, Fonte } from '@/constants/theme';

function icone(ativo: NomeIcone, inativo: NomeIcone) {
  function TabIcone({ color, focused }: { color: unknown; focused: boolean }) {
    return <Icone nome={focused ? ativo : inativo} cor={String(color)} tamanho={26} />;
  }
  return TabIcone;
}

export default function AbasLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Cores.primaria,
        tabBarInactiveTintColor: '#55626F',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarItemStyle: { paddingHorizontal: 0 },
        tabBarStyle: {
          height: 70 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: Cores.borda,
          backgroundColor: Cores.superficie,
        },
        headerStyle: { backgroundColor: Cores.primaria },
        headerTintColor: Cores.branco,
        headerTitleStyle: { fontWeight: '800', fontSize: Fonte.grande },
        headerTitleAlign: 'center',
        sceneStyle: { backgroundColor: Cores.fundo },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', headerShown: false, tabBarIcon: icone('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="servicos"
        options={{ title: 'Serviços', tabBarIcon: icone('view-grid', 'view-grid-outline') }}
      />
      <Tabs.Screen
        name="solicitacoes"
        options={{
          title: 'Pedidos',
          headerTitle: 'Minhas solicitações',
          tabBarIcon: icone('clipboard-text', 'clipboard-text-outline'),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Agenda', tabBarIcon: icone('calendar-month', 'calendar-month-outline') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', headerTitle: 'Meu perfil', tabBarIcon: icone('account-circle', 'account-circle-outline') }}
      />
    </Tabs>
  );
}
