import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function FormSection({ title, children }: PropsWithChildren<{ title: string }>) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.title}>
        {title.toUpperCase()}
      </ThemedText>
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
  title: {
    letterSpacing: 0.6,
  },
  content: {
    gap: Spacing.three,
  },
});
