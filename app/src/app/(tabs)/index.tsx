import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { HeroCarousel } from '@/components/HeroCarousel';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <Screen maxWidth={1600} style={styles.screen}>
      <Image
        source={require('@/assets/images/hero-logo.png')}
        style={styles.heroImage}
        contentFit="cover"
      />

      <ThemedText type="default" themeColor="textSecondary" style={styles.tagline}>
        Decorações de festa prontas — e kits personalizados sob medida para a sua celebração.
      </ThemedText>

      <View style={styles.actions}>
        <Button title="Ver catálogo" onPress={() => router.push('/(tabs)/catalogo')} />
      </View>

      <HeroCarousel />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.four,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.large,
  },
  tagline: {
    textAlign: 'center',
  },
  actions: {
    width: '100%',
  },
});
