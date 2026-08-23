import type { Produto } from '@global-decora/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Tag } from './Tag';
import { ThemedText } from './themed-text';

export function ProductCard({ produto, onPress }: { produto: Produto; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 },
      ]}>
      {produto.imagemUrl ? (
        <Image source={{ uri: produto.imagemUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.placeholder, { backgroundColor: theme.secondary }]} />
      )}
      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {produto.nome}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="primary">
          R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
        </ThemedText>
        <View style={styles.tags}>
          {produto.formato ? <Tag label={produto.formato.nome} /> : null}
          {produto.estilo ? <Tag label={produto.estilo.nome} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius.medium,
    overflow: 'hidden',
    margin: Spacing.two,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  placeholder: {
    opacity: 0.4,
  },
  info: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  tags: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.one,
    flexWrap: 'wrap',
  },
});
