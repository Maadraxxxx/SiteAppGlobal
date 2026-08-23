import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LINKS = [
  { href: '/admin/categorias', label: 'Categorias', icon: 'folder' as const },
  { href: '/admin/produtos', label: 'Produtos', icon: 'cube' as const },
];

export default function AdminDashboard() {
  const theme = useTheme();

  return (
    <Screen>
      <ThemedText type="title">Painel Admin</ThemedText>
      <View style={styles.grid}>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href as never} asChild>
            <Pressable
              style={StyleSheet.flatten([styles.card, { backgroundColor: theme.backgroundElement }])}>
              <Ionicons name={link.icon} size={28} color={theme.primary} />
              <ThemedText type="smallBold">{link.label}</ThemedText>
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  card: {
    width: 140,
    height: 100,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
});
