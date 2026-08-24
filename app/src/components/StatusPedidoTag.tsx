import type { StatusPedido } from '@global-decora/shared';
import { StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export const ROTULO_STATUS: Record<StatusPedido, string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  PAGO: 'Pago',
  EM_PRODUCAO: 'Em produção',
  ENVIADO: 'Enviado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
};

export function StatusPedidoTag({ status }: { status: StatusPedido }) {
  const theme = useTheme();

  const cor =
    status === 'CANCELADO'
      ? theme.danger
      : status === 'CONCLUIDO' || status === 'PAGO'
        ? theme.success
        : status === 'AGUARDANDO_PAGAMENTO'
          ? theme.textSecondary
          : theme.primary;

  return (
    <View style={[styles.tag, { borderColor: cor }]}>
      <View style={[styles.ponto, { backgroundColor: cor }]} />
      <ThemedText type="small" style={{ color: cor }}>
        {ROTULO_STATUS[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  ponto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
