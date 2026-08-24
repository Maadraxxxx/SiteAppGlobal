import type { Banner } from '@global-decora/shared';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useBanners } from '@/hooks/useBanners';
import { useTheme } from '@/hooks/use-theme';

const INTERVALO_MS = 4000;
// Os banners sao quadrados: sem um teto de largura a hero viraria um quadrado
// gigante no desktop. Limitar a largura mantem a imagem quadrada e sem corte,
// so que num tamanho razoavel em tela grande.
const MAX_LARGURA = 520;

export function HeroCarousel() {
  const { data } = useBanners();
  const items: Banner[] = data?.items ?? [];

  // Derivado da janela em vez de medido com onLayout: o onLayout nao reemite
  // de forma confiavel ao redimensionar aqui, e o Screen so tem o padding
  // lateral, entao a conta da janela ja da a largura real do slide.
  const { width: windowWidth } = useWindowDimensions();
  const slideWidth = Math.min(windowWidth - Spacing.four * 2, MAX_LARGURA);

  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const theme = useTheme();

  useEffect(() => {
    if (items.length < 2) return;

    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % items.length;
        scrollRef.current?.scrollTo({ x: next * slideWidth, animated: true });
        return next;
      });
    }, INTERVALO_MS);

    return () => clearInterval(timer);
  }, [items.length, slideWidth]);

  // Redimensionou: o offset antigo aponta pro lugar errado, reposiciona no slide atual.
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: index * slideWidth, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideWidth]);

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / slideWidth));
  }

  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.viewport, { width: slideWidth, height: slideWidth }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}>
          {items.map((item) => (
            <Image
              key={item.id}
              source={{ uri: item.imagemUrl }}
              // Altura em pixel (e nao '100%'): dentro de um ScrollView horizontal
              // a altura percentual nao tem de quem herdar e colapsa pra zero.
              style={{ width: slideWidth, height: slideWidth }}
              contentFit="cover"
            />
          ))}
        </ScrollView>
      </View>

      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((item, i) => (
            <View
              key={item.id}
              style={[
                styles.dot,
                i === index ? styles.dotAtivo : null,
                { backgroundColor: i === index ? theme.primary : theme.border },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  viewport: {
    alignSelf: 'center',
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.one,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotAtivo: {
    width: 20,
  },
});
