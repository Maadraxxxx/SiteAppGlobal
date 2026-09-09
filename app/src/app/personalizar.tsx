import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Screen, useMostrarBarraDeRolagem } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useProdutos } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

const CARD_MARGIN = Spacing.two;

/** Duas colunas no celular; mais só quando há largura de sobra. */
function colunasPara(largura: number) {
  if (largura >= 1100) return 4;
  if (largura >= 760) return 3;
  return 2;
}

function moeda(valor: string | number) {
  return `R$ ${(Number(valor) || 0).toFixed(2).replace('.', ',')}`;
}

export default function PersonalizarScreen() {
  const { width } = useWindowDimensions();
  const numColumns = colunasPara(width);
  const larguraConteudo = Math.min(width, 1200) - Spacing.four * 2;
  const itemWidth = larguraConteudo / numColumns - CARD_MARGIN * 2;

  // Só os esboços: produto pronto tem estampa e não é personalizável.
  const { data, isLoading } = useProdutos({ paraIA: true });
  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();

  const bases = data?.items ?? [];

  return (
    <Screen scroll={false} maxWidth={1200} style={styles.tela}>
      <View style={[styles.explicacao, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.icone, { backgroundColor: theme.primary }]}>
          <Ionicons name="sparkles" size={20} color={theme.primaryText} />
        </View>
        <View style={styles.explicacaoTexto}>
          <ThemedText type="smallBold">Escolha a peça</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Estas peças vêm sem estampa. Você escolhe uma, diz o tema da sua festa, e a arte é
            criada em cima dela.
          </ThemedText>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : bases.length ? (
        <FlatList
          showsVerticalScrollIndicator={mostrarBarra}
          key={numColumns}
          data={bases}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          style={styles.listaFlex}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/produto/${item.id}`)}
              style={({ pressed }) => [
                styles.card,
                {
                  width: itemWidth,
                  backgroundColor: theme.backgroundElement,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              {item.imagemUrl ? (
                <Image source={{ uri: item.imagemUrl }} style={styles.foto} contentFit="cover" />
              ) : (
                <View style={[styles.foto, { backgroundColor: theme.secondary }]} />
              )}

              <View style={styles.cardTexto}>
                <ThemedText type="smallBold" numberOfLines={2}>
                  {item.nome}
                </ThemedText>
                <ThemedText type="small" themeColor="primary">
                  {moeda(item.preco)}
                </ThemedText>
                {item.formato ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.formato.nome}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          )}
        />
      ) : (
        <View style={styles.vazio}>
          <View style={[styles.vazioIcone, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="color-palette-outline" size={28} color={theme.textSecondary} />
          </View>
          <ThemedText type="smallBold">Nenhuma peça disponível ainda</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
            Em breve você vai poder escolher uma peça e criar a arte da sua festa aqui.
          </ThemedText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: { gap: Spacing.three },
  explicacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  icone: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explicacaoTexto: { flex: 1, gap: Spacing.half },
  listaFlex: { flex: 1 },
  lista: { paddingBottom: Spacing.four },
  card: {
    margin: CARD_MARGIN,
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  foto: { width: '100%', aspectRatio: 1 },
  cardTexto: { padding: Spacing.three, gap: Spacing.half },
  carregando: { marginTop: Spacing.four },
  centralizado: { textAlign: 'center' },
  vazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  vazioIcone: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
});
