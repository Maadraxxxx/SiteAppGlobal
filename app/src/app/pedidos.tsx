import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function PedidosScreen() {
  const theme = useTheme();

  return (
    <Screen style={styles.container}>
      <Ionicons name="receipt-outline" size={40} color={theme.textSecondary} />
      <ThemedText type="title">Meus Pedidos</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        Você ainda não tem pedidos. Quando o pagamento estiver disponível, seus pedidos e o
        acompanhamento de cada um vão aparecer aqui.
      </ThemedText>
      <Button title="Ver catálogo" onPress={() => router.push('/(tabs)/catalogo')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: Spacing.three,
  },
  text: {
    textAlign: 'center',
  },
});
