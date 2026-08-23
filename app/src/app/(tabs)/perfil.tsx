import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';

export default function PerfilScreen() {
  const { usuario, isLoading, logout } = useAuth();
  const theme = useTheme();

  if (isLoading) return null;

  if (!usuario) {
    return (
      <Screen maxWidth={1600} style={styles.centered}>
        <ThemedText type="title">Perfil</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Entre na sua conta para acompanhar pedidos e usar o painel admin.
        </ThemedText>
        <View style={styles.actions}>
          <Button title="Entrar" onPress={() => router.push('/(auth)/login')} />
          <Button title="Criar conta" variant="ghost" onPress={() => router.push('/(auth)/register')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen maxWidth={1600}>
      <ThemedText type="title">Perfil</ThemedText>

      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">{usuario.nome}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {usuario.email}
        </ThemedText>
      </View>

      {usuario.role === 'ADMIN' ? (
        <Pressable
          onPress={() => router.push('/admin')}
          style={[styles.adminLink, { backgroundColor: theme.primary }]}>
          <Ionicons name="settings" color={theme.primaryText} size={20} />
          <ThemedText type="smallBold" themeColor="primaryText">
            Painel Admin
          </ThemedText>
        </Pressable>
      ) : null}

      <Button title="Sair" variant="ghost" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingTop: Spacing.six,
  },
  subtitle: {
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Radius.medium,
    gap: Spacing.half,
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    justifyContent: 'center',
  },
});
