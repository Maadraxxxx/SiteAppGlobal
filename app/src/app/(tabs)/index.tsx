import type { Categoria, Produto } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CartButton } from '@/components/CartButton';
import { HeroCarousel } from '@/components/HeroCarousel';
import { ProductCard } from '@/components/ProductCard';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ROTAS } from '@/lib/rotas';
import { useCategorias } from '@/hooks/useCatalogo';
import { useProdutos } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

const DESTAQUE_CARD_WIDTH = 160;
const VITRINE_MAX = 8;

function SectionHeader({ titulo, acao }: { titulo: string; acao?: { label: string; onPress: () => void } }) {
  const theme = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {titulo}
      </ThemedText>
      {acao ? (
        // Pastilha cheia em vez de texto solto: ao lado de um título grande, o
        // link se perdia e não parecia clicável.
        <Pressable
          onPress={acao.onPress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.sectionAcao,
            { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
          ]}>
          <ThemedText type="smallBold" themeColor="primaryText">
            {acao.label}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Uma fileira de produtos com titulo e "Ver todos" — o mesmo desenho dos
 * Destaques. Some sozinha quando a categoria nao tem produto: prateleira vazia
 * na tela inicial passa impressao de loja parada.
 */
function Vitrine({
  titulo,
  produtos,
  verTodos,
}: {
  titulo: string;
  produtos: Produto[];
  verTodos: () => void;
}) {
  if (!produtos.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader titulo={titulo} acao={{ label: 'Ver todos', onPress: verTodos }} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rowBleed}
        contentContainerStyle={styles.destaquesContent}>
        {produtos.map((produto) => (
          <ProductCard
            key={produto.id}
            produto={produto}
            width={DESTAQUE_CARD_WIDTH}
            onPress={() => router.push(`/produto/${produto.id}`)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * Cada categoria busca os proprios produtos, e por isso e um componente — hook
 * nao pode ser chamado dentro de um map na tela.
 */
function VitrineDaCategoria({ categoria }: { categoria: Categoria }) {
  const produtos = useProdutos({ categoria: categoria.slug });

  return (
    <Vitrine
      titulo={categoria.nome}
      produtos={produtos.data?.items.slice(0, VITRINE_MAX) ?? []}
      verTodos={() => router.push(ROTAS.catalogoDaCategoria(categoria.slug))}
    />
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { usuario } = useAuth();
  const produtos = useProdutos();
  const categorias = useCategorias();

  const primeiroNome = usuario?.nome?.trim().split(' ')[0];
  const destaques = produtos.data?.items.slice(0, VITRINE_MAX) ?? [];
  // Quem escolhe quais aparecem aqui e o admin, na tela "Categorias na Home".
  const vitrines = categorias.data?.items.filter((c) => c.naHome) ?? [];

  return (
    <Screen maxWidth={1200} style={styles.screen}>
      <View style={styles.topBar}>
        <Image source={require('@/assets/images/hero-logo.png')} style={styles.logo} contentFit="contain" />
        <CartButton />
      </View>

      <ThemedText type="subtitle" style={styles.saudacao}>
        {primeiroNome ? `Seja bem-vindo, ${primeiroNome}!` : 'Seja bem-vindo!'}
      </ThemedText>

      <HeroCarousel />

      <Vitrine
        titulo="Destaques"
        produtos={destaques}
        verTodos={() => router.push('/(tabs)/catalogo')}
      />

      {vitrines.map((categoria) => (
        <VitrineDaCategoria key={categoria.id} categoria={categoria} />
      ))}

      <Pressable
        onPress={() => router.push('/(tabs)/catalogo')}
        style={({ pressed }) => [
          styles.iaCard,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
        ]}>
        <View style={[styles.iaIcone, { backgroundColor: theme.primary }]}>
          <Ionicons name="sparkles" size={22} color={theme.primaryText} />
        </View>
        <View style={styles.iaTexto}>
          <ThemedText type="smallBold">Personalize com IA</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Escolha um produto, diga o tema da sua festa e veja a peça ganhar a cara dela.
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.four,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 104,
    aspectRatio: 16 / 9,
    borderRadius: Radius.small,
  },
  saudacao: {
    fontSize: 24,
    lineHeight: 32,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionAcao: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  // Deixa a vitrine correr ate a borda da tela, furando o padding lateral do
  // Screen, mas mantendo o primeiro card alinhado com o texto das secoes.
  rowBleed: {
    marginHorizontal: -Spacing.four,
  },
  destaquesContent: {
    // ProductCard ja tem margin propria, entao aqui o padding compensa a folga.
    paddingHorizontal: Spacing.four - Spacing.two,
  },
  iaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  iaIcone: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iaTexto: {
    flex: 1,
    gap: Spacing.half,
  },
});
