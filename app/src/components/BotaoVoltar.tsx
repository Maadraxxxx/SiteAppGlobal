import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, type ColorValue } from 'react-native';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Href = Parameters<typeof router.push>[0];

const HOME = '/(tabs)' as Href;

/**
 * Seta de voltar única do app.
 *
 * Não usamos a seta nativa do cabeçalho porque ela some quando não há tela
 * anterior — e isso acontece direto no navegador: link aberto numa aba nova,
 * URL colada na barra, página recarregada. Nesses casos o cliente ficava sem
 * saída nenhuma. Aqui, sem histórico, a seta leva pra Home em vez de sumir.
 */
export function BotaoVoltar({ cor }: { cor?: ColorValue }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace(HOME))}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      style={({ pressed }) => [styles.botao, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name="arrow-back" size={24} color={cor ?? theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    paddingRight: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
