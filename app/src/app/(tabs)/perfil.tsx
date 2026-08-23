import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';

function MenuRow({
  icon,
  label,
  onPress,
  highlight,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  highlight?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.menuRow,
        { backgroundColor: highlight ? theme.primary : theme.backgroundElement },
      ]}>
      <Ionicons name={icon} size={20} color={highlight ? theme.primaryText : theme.text} />
      <ThemedText type="smallBold" themeColor={highlight ? 'primaryText' : 'text'} style={styles.menuLabel}>
        {label}
      </ThemedText>
      <Ionicons name="chevron-forward" size={18} color={highlight ? theme.primaryText : theme.textSecondary} />
    </Pressable>
  );
}

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

      <View style={styles.menu}>
        <MenuRow icon="receipt-outline" label="Meus Pedidos" onPress={() => router.push('/pedidos')} />
        <MenuRow icon="person-outline" label="Editar Perfil" onPress={() => router.push('/editar-perfil')} />
        {usuario.role === 'ADMIN' ? (
          <MenuRow icon="settings" label="Painel Admin" onPress={() => router.push('/admin')} highlight />
        ) : null}
      </View>

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
  menu: {
    gap: Spacing.two,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  menuLabel: {
    flex: 1,
  },
});
