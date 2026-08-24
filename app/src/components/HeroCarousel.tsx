import type { Banner } from '@global-decora/shared';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useBanners } from '@/hooks/useBanners';
import { useTheme } from '@/hooks/use-theme';

const INTERVALO_MS = 4000;

export function HeroCarousel() {
  const { data } = useBanners();
  const items: Banner[] = data?.items ?? [];
  const { width } = useWindowDimensions();
  const slideWidth = Math.min(width, 1600) - Spacing.four * 2;

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

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const newIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setIndex(newIndex);
  }

  if (!items.length) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={{ width: slideWidth }}>
        {items.map((item) => (
          <Image
            key={item.id}
            source={{ uri: item.imagemUrl }}
            style={[styles.slide, { width: slideWidth }]}
            contentFit="cover"
          />
        ))}
      </ScrollView>

      {items.length > 1 ? (
        <View style={styles.dots}>
          {items.map((item, i) => (
            <View
              key={item.id}
              style={[
                styles.dot,
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
    alignItems: 'center',
    gap: Spacing.two,
  },
  slide: {
    aspectRatio: 1,
    borderRadius: Radius.large,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
