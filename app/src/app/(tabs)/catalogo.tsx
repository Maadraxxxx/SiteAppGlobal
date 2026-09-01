import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { CartButton } from '@/components/CartButton';
import { Chip } from '@/components/Chip';
import { ProductCard } from '@/components/ProductCard';
import { BotaoVoltar } from '@/components/BotaoVoltar';
import { Screen, useMostrarBarraDeRolagem } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { estilosHooks, formatosHooks, useCategorias } from '@/hooks/useCatalogo';
import { useTheme } from '@/hooks/use-theme';
import { PRODUTOS_POR_LOTE, useProdutosInfinitos } from '@/hooks/useProdutos';

interface TagOption {
  id: string;
  nome: string;
  slug: string;
}

/** Filtro escolhido, mostrado fora do modal pra ficar claro o que esta valendo. */
interface FiltroAtivo {
  chave: string;
  nome: string;
  limpar: () => void;
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

const CARD_MARGIN = Spacing.two;

function colunasPara(width: number) {
  if (width >= 1500) return 6;
  if (width >= 1200) return 5;
  if (width >= 900) return 4;
  if (width >= 600) return 3;
  return 2;
}

/**
 * Largura do card calculada a partir da janela, nao medida com onLayout — o
 * onLayout nao dispara de forma confiavel aqui, e sem largura os cards caiam
 * em flex:1, o que fazia o card sozinho da ultima linha esticar pra fila toda.
 */
function useGrade() {
  const { width } = useWindowDimensions();
  const numColumns = colunasPara(width);
  const larguraConteudo = Math.min(width, 1600) - Spacing.four * 2;
  return { numColumns, itemWidth: larguraConteudo / numColumns - CARD_MARGIN * 2 };
}

export default function CatalogoScreen() {
  const { categoria: categoriaDaHome } = useLocalSearchParams<{ categoria?: string }>();
  const [categoriaSlug, setCategoriaSlug] = useState<string>();
  const [formatoSlug, setFormatoSlug] = useState<string>();
  const [estiloSlug, setEstiloSlug] = useState<string>();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();
  const { numColumns, itemWidth } = useGrade();

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Chegou pela vitrine da Home: aplica o filtro e devolve o parametro pro
  // estado normal da tela. Sem limpar, tocar a mesma categoria de novo depois
  // de tirar o filtro na mao nao faria nada — o parametro ja seria o mesmo.
  useEffect(() => {
    if (!categoriaDaHome) return;
    setCategoriaSlug(categoriaDaHome);
    router.setParams({ categoria: undefined });
  }, [categoriaDaHome]);

  const categorias = useCategorias();
  const formatos = formatosHooks.useList();
  const estilos = estilosHooks.useList();

  const produtos = useProdutosInfinitos({
    categoria: categoriaSlug,
    formato: formatoSlug,
    estilo: estiloSlug,
    search: search || undefined,
  });

  const quantidadeFiltros = [categoriaSlug, formatoSlug, estiloSlug].filter(Boolean).length;

  const filtrosAtivos: FiltroAtivo[] = [];
  const categoriaAtiva = categorias.data?.items.find((c) => c.slug === categoriaSlug);
  if (categoriaAtiva) {
    filtrosAtivos.push({
      chave: 'categoria',
      nome: categoriaAtiva.nome,
      limpar: () => setCategoriaSlug(undefined),
    });
  }
  const formatoAtivo = formatos.data?.items.find((f) => f.slug === formatoSlug);
  if (formatoAtivo) {
    filtrosAtivos.push({ chave: 'formato', nome: formatoAtivo.nome, limpar: () => setFormatoSlug(undefined) });
  }
  const estiloAtivo = estilos.data?.items.find((e) => e.slug === estiloSlug);
  if (estiloAtivo) {
    filtrosAtivos.push({ chave: 'estilo', nome: estiloAtivo.nome, limpar: () => setEstiloSlug(undefined) });
  }

  // As paginas ja carregadas viram uma lista so pra FlatList.
  const itens = produtos.data?.pages.flatMap((pagina) => pagina.items) ?? [];
  // O total vem do servidor: mostrar so o que ja carregou faria o numero
  // crescer sozinho enquanto a pessoa rola, parecendo defeito.
  const total = produtos.data?.pages[0]?.total ?? 0;
  const temBusca = search.length > 0;

  function carregarMais() {
    // O onEndReached dispara varias vezes durante a rolagem; sem esta guarda
    // sairiam varias buscas da mesma pagina.
    if (produtos.hasNextPage && !produtos.isFetchingNextPage) produtos.fetchNextPage();
  }

  function limparFiltros() {
    setCategoriaSlug(undefined);
    setFormatoSlug(undefined);
    setEstiloSlug(undefined);
  }

  function limparTudo() {
    limparFiltros();
    setSearchInput('');
  }

  return (
    <Screen scroll={false} maxWidth={1600} style={styles.screen}>
      <View style={styles.headerRow}>
        {/* Ao lado do título, e não num cabeçalho nativo: a tela já tem o
            título aqui, e a barra nativa só repetiria a palavra. */}
        <View style={styles.headerTitulo}>
          <BotaoVoltar />
          <ThemedText type="subtitle">Catálogo</ThemedText>
        </View>
        <CartButton />
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textSecondary} />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Buscar produto"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text, fontFamily: Fonts.sans }]}
          />
          {searchInput ? (
            <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => setFiltrosAbertos(true)}
          style={[
            styles.filterButton,
            {
              backgroundColor: quantidadeFiltros ? theme.primary : theme.backgroundElement,
              borderColor: quantidadeFiltros ? theme.primary : theme.border,
            },
          ]}>
          <Ionicons name="options-outline" size={20} color={quantidadeFiltros ? theme.primaryText : theme.text} />
          {quantidadeFiltros > 0 ? (
            <View style={[styles.badge, { backgroundColor: theme.background }]}>
              <ThemedText type="small" themeColor="primary" style={styles.badgeText}>
                {quantidadeFiltros}
              </ThemedText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {filtrosAtivos.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.ativosBleed}
          contentContainerStyle={styles.ativosContent}>
          {filtrosAtivos.map((filtro) => (
            <Pressable
              key={filtro.chave}
              onPress={filtro.limpar}
              style={[styles.filtroAtivo, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small">{filtro.nome}</ThemedText>
              <Ionicons name="close" size={14} color={theme.text} />
            </Pressable>
          ))}
          <Pressable onPress={limparFiltros} style={styles.limparLink} hitSlop={8}>
            <ThemedText type="smallBold" themeColor="primary">
              Limpar
            </ThemedText>
          </Pressable>
        </ScrollView>
      ) : null}

      {produtos.isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : itens.length ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {total} {total === 1 ? 'produto' : 'produtos'}
          </ThemedText>
          <FlatList
          showsVerticalScrollIndicator={mostrarBarra}
            key={numColumns}
            data={itens}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            style={styles.listFlex}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <ProductCard produto={item} width={itemWidth} onPress={() => router.push(`/produto/${item.id}`)} />
            )}
            onEndReached={carregarMais}
            // Meia tela de antecedencia: o lote seguinte chega antes de a
            // pessoa bater no fim, entao a rolagem nao para pra esperar.
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              produtos.isFetchingNextPage ? (
                <ActivityIndicator style={styles.carregandoMais} />
              ) : !produtos.hasNextPage && itens.length > PRODUTOS_POR_LOTE ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.fimDaLista}>
                  Você viu todos os produtos
                </ThemedText>
              ) : null
            }
            // Segurar so o que esta perto da tela. O padrao do windowSize (21)
            // mantem dez telas montadas pra cada lado — memoria e trabalho de
            // layout que ninguem ve.
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={50}
            windowSize={5}
            // Na web isso deixa buraco branco no lugar do card ao rolar rapido.
            removeClippedSubviews={Platform.OS !== 'web'}
          />
        </>
      ) : (
        <View style={styles.vazio}>
          <View style={[styles.vazioIcone, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="search" size={28} color={theme.textSecondary} />
          </View>
          <ThemedText type="smallBold">Nenhum produto encontrado</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.vazioTexto}>
            {temBusca || quantidadeFiltros
              ? 'Tente outra busca ou tire alguns filtros.'
              : 'Assim que os produtos forem cadastrados eles aparecem aqui.'}
          </ThemedText>
          {temBusca || quantidadeFiltros ? (
            <View style={styles.vazioAcao}>
              <Button title="Limpar busca e filtros" variant="ghost" onPress={limparTudo} />
            </View>
          ) : null}
        </View>
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
            <Pressable onPress={() => setFiltrosAbertos(false)} hitSlop={8}>
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
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
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
  // Deixa os filtros escolhidos correrem ate a borda, furando o padding do Screen.
  ativosBleed: {
    flexGrow: 0,
    marginHorizontal: -Spacing.four,
  },
  ativosContent: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  filtroAtivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  limparLink: {
    paddingHorizontal: Spacing.two,
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
    paddingBottom: Spacing.three,
  },
  carregandoMais: {
    paddingVertical: Spacing.four,
  },
  fimDaLista: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  loading: {
    marginTop: Spacing.six,
  },
  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  vazioIcone: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  vazioTexto: {
    textAlign: 'center',
  },
  vazioAcao: {
    marginTop: Spacing.two,
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
