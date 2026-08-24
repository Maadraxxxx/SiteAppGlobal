import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { HeroCarousel } from '@/components/HeroCarousel';
import { Screen } from '@/components/Screen';
import { Radius, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <Screen maxWidth={1600} style={styles.screen}>
      <Image source={require('@/assets/images/hero-logo.png')} style={styles.logo} contentFit="contain" />

      <HeroCarousel />

      <View style={styles.actions}>
        <Button title="Ver catálogo" onPress={() => router.push('/(tabs)/catalogo')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.four,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    aspectRatio: 16 / 9,
    borderRadius: Radius.medium,
  },
  actions: {
    width: '100%',
  },
});
