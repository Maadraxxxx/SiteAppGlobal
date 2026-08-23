import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from '@/components/Chip';
import { ProductCard } from '@/components/ProductCard';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { estilosHooks, formatosHooks, useCategorias } from '@/hooks/useCatalogo';
import { useProdutos } from '@/hooks/useProdutos';

export default function CatalogoScreen() {
  const [categoriaSlug, setCategoriaSlug] = useState<string>();
  const [formatoSlug, setFormatoSlug] = useState<string>();
  const [estiloSlug, setEstiloSlug] = useState<string>();

  const categorias = useCategorias();
  const formatos = formatosHooks.useList();
  const estilos = estilosHooks.useList();

  const produtos = useProdutos({
    categoria: categoriaSlug,
    formato: formatoSlug,
    estilo: estiloSlug,
  });

  return (
    <Screen scroll={false} style={styles.screen}>
      <ThemedText type="title">Catálogo</ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <View style={styles.filterGroup}>
          {categorias.data?.items.map((categoria) => (
            <Chip
              key={categoria.id}
              label={categoria.nome}
              selected={categoriaSlug === categoria.slug}
              onPress={() => setCategoriaSlug((prev) => (prev === categoria.slug ? undefined : categoria.slug))}
            />
          ))}
          {formatos.data?.items.map((formato) => (
            <Chip
              key={formato.id}
              label={formato.nome}
              selected={formatoSlug === formato.slug}
              onPress={() => setFormatoSlug((prev) => (prev === formato.slug ? undefined : formato.slug))}
            />
          ))}
          {estilos.data?.items.map((estilo) => (
            <Chip
              key={estilo.id}
              label={estilo.nome}
              selected={estiloSlug === estilo.slug}
              onPress={() => setEstiloSlug((prev) => (prev === estilo.slug ? undefined : estilo.slug))}
            />
          ))}
        </View>
      </ScrollView>

      {produtos.isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : produtos.data?.items.length ? (
        <FlatList
          data={produtos.data.items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          style={styles.listFlex}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProductCard produto={item} onPress={() => router.push(`/produto/${item.id}`)} />
          )}
        />
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          Nenhum produto encontrado com esses filtros.
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: Spacing.four,
  },
  filters: {
    flexGrow: 0,
    marginTop: Spacing.two,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    paddingVertical: Spacing.three,
  },
  loading: {
    marginTop: Spacing.six,
  },
  empty: {
    marginTop: Spacing.six,
    textAlign: 'center',
  },
});
