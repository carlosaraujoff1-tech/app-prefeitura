import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Cores, Espaco, Fonte } from '@/constants/theme';

// Tela provisória: as telas reais entram na Etapa 2 (app do cidadão).
export default function Inicio() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'SAP Cidadão' }} />
      <Text style={styles.titulo}>SAP Cidadão</Text>
      <Text style={styles.texto}>Prefeitura de Santo Antônio da Platina</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Espaco.xl, gap: Espaco.sm },
  titulo: { fontSize: Fonte.titulo, fontWeight: '700', color: Cores.primaria },
  texto: { fontSize: Fonte.normal, color: Cores.textoSecundario, textAlign: 'center' },
});
