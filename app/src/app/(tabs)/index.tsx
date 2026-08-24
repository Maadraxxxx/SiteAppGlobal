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
import { useCategorias } from '@/hooks/useCatalogo';
import { useProdutos } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

const DESTAQUE_CARD_WIDTH = 160;

function SectionHeader({ titulo, acao }: { titulo: string; acao?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {titulo}
      </ThemedText>
      {acao ? (
        <Pressable onPress={acao.onPress} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="primary">
            {acao.label}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { usuario } = useAuth();
  const categorias = useCategorias();
  const produtos = useProdutos();

  const primeiroNome = usuario?.nome?.trim().split(' ')[0];
  const listaCategorias = categorias.data?.items ?? [];
  const destaques = produtos.data?.items.slice(0, 8) ?? [];

  return (
    <Screen maxWidth={1200} style={styles.screen}>
      <View style={styles.topBar}>
        <Image source={require('@/assets/images/hero-logo.png')} style={styles.logo} contentFit="contain" />
        <CartButton />
      </View>

      <View style={styles.saudacao}>
        <ThemedText type="subtitle" style={styles.saudacaoTitulo}>
          {primeiroNome ? `Oi, ${primeiroNome}!` : 'Bem-vindo à Global Decora'}
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Aqui seu tema é feito com muito carinho para a sua decoração.
        </ThemedText>
      </View>

      <HeroCarousel />

      {listaCategorias.length ? (
        <View style={styles.section}>
          <SectionHeader titulo="Categorias" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.rowBleed}
            contentContainerStyle={styles.rowContent}>
            {listaCategorias.map((categoria) => (
              <Pressable
                key={categoria.id}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/catalogo', params: { categoria: categoria.slug } })
                }
                style={({ pressed }) => [
                  styles.categoriaPill,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
                ]}>
                <ThemedText type="smallBold">{categoria.nome}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {destaques.length ? (
        <View style={styles.section}>
          <SectionHeader
            titulo="Destaques"
            acao={{ label: 'Ver todos', onPress: () => router.push('/(tabs)/catalogo') }}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.rowBleed}
            contentContainerStyle={styles.destaquesContent}>
            {destaques.map((produto) => (
              <ProductCard
                key={produto.id}
                produto={produto}
                width={DESTAQUE_CARD_WIDTH}
                onPress={() => router.push(`/produto/${produto.id}`)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

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
    gap: Spacing.one,
  },
  saudacaoTitulo: {
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
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
  },
  // Deixa as listas horizontais correrem ate a borda da tela, furando o
  // padding lateral do Screen, mas mantendo o primeiro item alinhado ao texto.
  rowBleed: {
    marginHorizontal: -Spacing.four,
  },
  rowContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  destaquesContent: {
    // ProductCard ja tem margin propria, entao aqui o padding compensa a folga.
    paddingHorizontal: Spacing.four - Spacing.two,
  },
  categoriaPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
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
