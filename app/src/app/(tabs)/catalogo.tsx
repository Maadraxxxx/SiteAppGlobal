import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { CartButton } from '@/components/CartButton';
import { Chip } from '@/components/Chip';
import { ProductCard } from '@/components/ProductCard';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { estilosHooks, formatosHooks, useCategorias } from '@/hooks/useCatalogo';
import { useTheme } from '@/hooks/use-theme';
import { useProdutos } from '@/hooks/useProdutos';

interface TagOption {
  id: string;
  nome: string;
  slug: string;
}

function FilterRow({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string;
  items: TagOption[];
  selected?: string;
  onSelect: (slug: string | undefined) => void;
}) {
  if (!items.length) return null;

  return (
    <View style={styles.filterGroup}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.chipRow}>
        {items.map((item) => (
          <Chip
            key={item.id}
            label={item.nome}
            selected={selected === item.slug}
            onPress={() => onSelect(selected === item.slug ? undefined : item.slug)}
          />
        ))}
      </View>
    </View>
  );
}

function useNumColumns() {
  const { width } = useWindowDimensions();
  if (width >= 1500) return 6;
  if (width >= 1200) return 5;
  if (width >= 900) return 4;
  if (width >= 600) return 3;
  return 2;
}

export default function CatalogoScreen() {
  // A Home manda a categoria escolhida pelos atalhos; sem parametro abre sem filtro.
  const params = useLocalSearchParams<{ categoria?: string }>();
  const [categoriaSlug, setCategoriaSlug] = useState<string | undefined>(params.categoria);
  const [formatoSlug, setFormatoSlug] = useState<string>();
  const [estiloSlug, setEstiloSlug] = useState<string>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const theme = useTheme();
  const numColumns = useNumColumns();
  const [listWidth, setListWidth] = useState(0);
  const cardMargin = Spacing.two;
  const itemWidth = listWidth > 0 ? listWidth / numColumns - cardMargin * 2 : undefined;

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // A aba fica montada, entao voltar na Home e escolher outra categoria precisa
  // reaplicar o filtro — o valor inicial do useState so vale na primeira vez.
  useEffect(() => {
    if (params.categoria) setCategoriaSlug(params.categoria);
  }, [params.categoria]);

  const categorias = useCategorias();
  const formatos = formatosHooks.useList();
  const estilos = estilosHooks.useList();

  const produtos = useProdutos({
    categoria: categoriaSlug,
    formato: formatoSlug,
    estilo: estiloSlug,
    search: search || undefined,
  });

  const filtrosAtivos = [categoriaSlug, formatoSlug, estiloSlug].filter(Boolean).length;

  function limparFiltros() {
    setCategoriaSlug(undefined);
    setFormatoSlug(undefined);
    setEstiloSlug(undefined);
  }

  return (
    <Screen scroll={false} maxWidth={1600} style={styles.screen}>
      <View style={styles.headerRow}>
        <ThemedText type="title">Catálogo</ThemedText>
        <CartButton />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <TextField
            label="Buscar produto"
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Nome do produto"
          />
        </View>
        <Pressable
          onPress={() => setFiltrosAbertos(true)}
          style={[styles.filterButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Ionicons name="filter" size={20} color={theme.text} />
          {filtrosAtivos > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <ThemedText type="small" themeColor="primaryText" style={styles.badgeText}>
                {filtrosAtivos}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {produtos.isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : produtos.data?.items.length ? (
        <FlatList
          key={numColumns}
          data={produtos.data.items}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          style={styles.listFlex}
          contentContainerStyle={styles.list}
          onLayout={(event) => setListWidth(event.nativeEvent.layout.width)}
          renderItem={({ item }) => (
            <ProductCard produto={item} width={itemWidth} onPress={() => router.push(`/produto/${item.id}`)} />
          )}
        />
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
          Nenhum produto encontrado.
        </ThemedText>
      )}

      <Modal
        visible={filtrosAbertos}
        animationType="slide"
        transparent
        onRequestClose={() => setFiltrosAbertos(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFiltrosAbertos(false)} />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.sheetHeader}>
            <ThemedText type="subtitle">Filtrar</ThemedText>
            <Pressable onPress={() => setFiltrosAbertos(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.sheetContent}>
            <FilterRow
              label="Categoria"
              items={categorias.data?.items ?? []}
              selected={categoriaSlug}
              onSelect={setCategoriaSlug}
            />
            <FilterRow
              label="Formato"
              items={formatos.data?.items ?? []}
              selected={formatoSlug}
              onSelect={setFormatoSlug}
            />
            <FilterRow
              label="Estilo"
              items={estilos.data?.items ?? []}
              selected={estiloSlug}
              onSelect={setEstiloSlug}
            />
          </ScrollView>

          <View style={styles.sheetActions}>
            <View style={styles.sheetActionButton}>
              <Button title="Limpar filtros" variant="ghost" onPress={limparFiltros} />
            </View>
            <View style={styles.sheetActionButton}>
              <Button title="Ver resultados" onPress={() => setFiltrosAbertos(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  searchField: {
    flex: 1,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
  },
  filterGroup: {
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    maxHeight: '75%',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetContent: {
    gap: Spacing.three,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sheetActionButton: {
    flex: 1,
  },
});
