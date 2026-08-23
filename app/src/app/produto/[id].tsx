import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Tag } from '@/components/Tag';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useProduto } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

export default function ProdutoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useProduto(id);
  const theme = useTheme();

  if (isLoading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen style={styles.centered}>
        <ThemedText themeColor="textSecondary">Produto nao encontrado.</ThemedText>
      </Screen>
    );
  }

  const { produto } = data;

  return (
    <Screen>
      {produto.imagemUrl ? (
        <Image source={{ uri: produto.imagemUrl }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, { backgroundColor: theme.secondary }]} />
      )}

      <ThemedText type="subtitle">{produto.nome}</ThemedText>
      <ThemedText type="title" themeColor="primary" style={styles.preco}>
        R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
      </ThemedText>

      <View style={styles.tags}>
        {produto.formato ? <Tag label={produto.formato.nome} /> : null}
        {produto.estilo ? <Tag label={produto.estilo.nome} /> : null}
        {produto.categoria ? <Tag label={produto.categoria.nome} /> : null}
      </View>

      {produto.descricao ? <ThemedText themeColor="textSecondary">{produto.descricao}</ThemedText> : null}

      <View style={styles.specs}>
        {produto.medidas ? (
          <ThemedText type="small" themeColor="textSecondary">
            Medidas: {produto.medidas}
          </ThemedText>
        ) : null}
        {produto.peso ? (
          <ThemedText type="small" themeColor="textSecondary">
            Peso: {produto.peso} kg
          </ThemedText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.large,
  },
  preco: {
    fontSize: 28,
    lineHeight: 34,
  },
  tags: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  specs: {
    gap: Spacing.one,
  },
});
