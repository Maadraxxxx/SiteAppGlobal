import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

interface Props {
  title: string;
  /** Uma linha dizendo pra que serve o bloco. Fica sob o título. */
  descricao?: string;
  /** Ícone da seção, pra dar relevo à sequência num formulário longo. */
  icone?: keyof typeof Ionicons.glyphMap;
}

export function FormSection({ title, descricao, icone, children }: PropsWithChildren<Props>) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.cabecalho}>
        {icone ? (
          <View style={[styles.icone, { backgroundColor: theme.background }]}>
            <Ionicons name={icone} size={16} color={theme.primary} />
          </View>
        ) : null}
        <View style={styles.cabecalhoTexto}>
          <ThemedText type="smallBold" style={styles.title}>
            {title.toUpperCase()}
          </ThemedText>
          {descricao ? (
            <ThemedText type="small" themeColor="textSecondary">
              {descricao}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  icone: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabecalhoTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    letterSpacing: 0.6,
  },
  content: {
    gap: Spacing.three,
  },
});
