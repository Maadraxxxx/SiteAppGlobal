import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Não encontrado' }} />
      <Screen style={styles.container}>
        <ThemedText type="title">Página não encontrada</ThemedText>
        <Link href="/(tabs)">
          <ThemedText type="linkPrimary" themeColor="primary">
            Voltar para a Home
          </ThemedText>
        </Link>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
});
