import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Href = Parameters<typeof router.push>[0];

const HOME = '/(tabs)' as Href;
const DIAMETRO = 36;

/**
 * Seta de voltar única do app: um círculo cheio na cor da marca, com a seta
 * branca dentro.
 *
 * Não usamos a seta nativa do cabeçalho porque ela some quando não há tela
 * anterior — e isso acontece direto no navegador: link aberto numa aba nova,
 * URL colada na barra, página recarregada. Nesses casos o cliente ficava sem
 * saída nenhuma. Aqui, sem histórico, a seta leva pra Home em vez de sumir.
 */
export function BotaoVoltar() {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace(HOME))}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [styles.area, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.circulo, { backgroundColor: theme.primary }]}>
        <Ionicons name="arrow-back" size={20} color={theme.primaryText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  area: {
    // Só à direita: o recuo da esquerda vem de quem coloca o botão, pra ele
    // cair na mesma coluna do conteúdo da tela.
    paddingRight: Spacing.two,
  },
  circulo: {
    width: DIAMETRO,
    height: DIAMETRO,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
