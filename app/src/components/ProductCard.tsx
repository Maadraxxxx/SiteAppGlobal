import type { Produto } from '@global-decora/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function ProductCard({
  produto,
  onPress,
  width,
}: {
  produto: Produto;
  onPress: () => void;
  /** Largura explícita em pixels — evita depender de aspectRatio dentro de um FlatList em grade,
   * que não calcula a altura de forma confiável no web quando a largura vem de flex. */
  width?: number;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        width ? { width } : styles.cardFallback,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 },
      ]}>
      {produto.imagemUrl ? (
        <Image
          source={{ uri: produto.imagemUrl }}
          style={[styles.image, width ? { height: width } : null]}
          contentFit="cover"
        />
      ) : (
        <View
          style={[styles.image, styles.placeholder, width ? { height: width } : null, { backgroundColor: theme.secondary }]}
        />
      )}
      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {produto.nome}
        </ThemedText>
        <ThemedText type="subtitle" themeColor="primary" style={styles.preco}>
          R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
        </ThemedText>
        {/* Uma linha de texto no lugar das tags em chip: dois chips nao cabem
            lado a lado na largura do card e quebravam pra segunda linha, o que
            deixava a grade com cards de alturas diferentes. */}
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {[produto.formato?.nome, produto.estilo?.nome].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.medium,
    overflow: 'hidden',
    margin: Spacing.two,
  },
  cardFallback: {
    flex: 1,
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
    gap: Spacing.half,
  },
  preco: {
    fontSize: 18,
    lineHeight: 24,
  },
});
