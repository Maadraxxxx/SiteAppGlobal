import { StyleSheet, View } from 'react-native';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppleButton, useAppleDisponivel } from './AppleButton';
import { GoogleButton, googleDisponivel } from './GoogleButton';
import { ThemedText } from './themed-text';

/**
 * Os jeitos de entrar sem senha, com o "ou" que os separa do formulário.
 *
 * Fica num lugar só porque o divisor depende dos dois: ele aparece uma vez,
 * e só se houver ao menos um botão abaixo dele. A Apple vem primeiro onde
 * existe — no iPhone é o que a pessoa espera encontrar, e a regra da loja é
 * que o botão dela nunca fique em desvantagem diante dos outros.
 */
export function LoginSocial({ onSucesso }: { onSucesso: () => void }) {
  const theme = useTheme();
  const appleDisponivel = useAppleDisponivel();

  if (!appleDisponivel && !googleDisponivel) return null;

  return (
    <View style={styles.container}>
      <View style={styles.divisor}>
        <View style={[styles.linha, { backgroundColor: theme.border }]} />
        <ThemedText type="small" themeColor="textSecondary">
          ou
        </ThemedText>
        <View style={[styles.linha, { backgroundColor: theme.border }]} />
      </View>

      {appleDisponivel ? <AppleButton onSucesso={onSucesso} /> : null}
      <GoogleButton onSucesso={onSucesso} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  linha: {
    flex: 1,
    height: 1,
  },
});
