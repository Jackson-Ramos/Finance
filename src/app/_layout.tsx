import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAvisos } from '../hooks/useAvisos';
import { useBoot } from '../hooks/useBoot';

/**
 * Layout raiz. Segura a navegação até o banco estar migrado e semeado —
 * nenhuma tela pode ler dados antes disso.
 */
export default function LayoutRaiz() {
  const { fase, erro } = useBoot();
  // Reagenda os avisos de vencimento sempre que os dados mudam.
  useAvisos(fase === 'pronto');

  return (
    <GestureHandlerRootView style={styles.raiz}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {fase === 'erro' ? (
          <Tela titulo="Falha ao abrir o banco" detalhe={erro ?? 'erro desconhecido'} />
        ) : fase === 'pronto' ? (
          <Stack screenOptions={{ headerShown: false }} />
        ) : (
          <Tela titulo="Preparando o banco…" carregando />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Tela({
  titulo,
  detalhe,
  carregando = false,
}: {
  titulo: string;
  detalhe?: string;
  carregando?: boolean;
}) {
  return (
    <View style={styles.centro}>
      {carregando ? <ActivityIndicator size="large" color="#0EA5E9" /> : null}
      <Text style={styles.titulo}>{titulo}</Text>
      {detalhe ? <Text style={styles.detalhe}>{detalhe}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  titulo: { fontSize: 16, fontWeight: '600', color: '#0F172A', textAlign: 'center' },
  detalhe: { fontSize: 12, color: '#B91C1C', textAlign: 'center', fontFamily: 'monospace' },
});
