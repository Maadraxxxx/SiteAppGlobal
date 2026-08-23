import { StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function Tag({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.tag, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="small" themeColor="text">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
});
