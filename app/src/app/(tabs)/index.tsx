import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <Screen maxWidth={1600} style={styles.screen}>
      <View style={[styles.hero, { backgroundColor: theme.primary }]}>
        <ThemedText style={[styles.wordmark, { fontFamily: Fonts.brand }]}>global</ThemedText>
        <ThemedText style={[styles.wordmarkSub, { fontFamily: Fonts.sansSemiBold }]}>DECORA</ThemedText>
        <ThemedText type="default" style={[styles.tagline, { color: '#FFFFFF' }]}>
          Decorações de festa prontas — e kits personalizados sob medida para a sua celebração.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Button title="Ver catálogo" onPress={() => router.push('/(tabs)/catalogo')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    gap: 0,
  },
  hero: {
    width: '100%',
    borderRadius: Radius.large,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  wordmark: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  wordmarkSub: {
    fontSize: 20,
    letterSpacing: 4,
    color: '#FFFFFF',
  },
  tagline: {
    textAlign: 'center',
    marginTop: Spacing.three,
    maxWidth: 320,
  },
  actions: {
    marginTop: Spacing.four,
    width: '100%',
    paddingHorizontal: Spacing.four,
  },
});
