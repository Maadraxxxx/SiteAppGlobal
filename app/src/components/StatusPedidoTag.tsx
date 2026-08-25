import type { StatusPagamentoPedido, StatusProducao } from '@global-decora/shared';
import { StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export const ROTULO_PAGAMENTO: Record<StatusPagamentoPedido, string> = {
  AGUARDANDO: 'Aguardando pagamento',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
};

// "Na fila" e nao "Aguardando": ao lado de "Aguardando pagamento" as duas
// etiquetas ficariam iguais e ninguem saberia qual e qual.
export const ROTULO_PRODUCAO: Record<StatusProducao, string> = {
  AGUARDANDO: 'Na fila',
  EM_PRODUCAO: 'Em produção',
  ENVIADO: 'Enviado',
  ENTREGUE: 'Entregue',
};

function Tag({ texto, cor }: { texto: string; cor: string }) {
  return (
    <View style={[styles.tag, { borderColor: cor }]}>
      <View style={[styles.ponto, { backgroundColor: cor }]} />
      <ThemedText type="small" style={{ color: cor }}>
        {texto}
      </ThemedText>
    </View>
  );
}

export function TagPagamento({ status }: { status: StatusPagamentoPedido }) {
  const theme = useTheme();
  const cor =
    status === 'PAGO' ? theme.success : status === 'CANCELADO' ? theme.danger : theme.textSecondary;

  return <Tag texto={ROTULO_PAGAMENTO[status]} cor={cor} />;
}

export function TagProducao({ status }: { status: StatusProducao }) {
  const theme = useTheme();
  const cor =
    status === 'ENTREGUE'
      ? theme.success
      : status === 'AGUARDANDO'
        ? theme.textSecondary
        : theme.primary;

  return <Tag texto={ROTULO_PRODUCAO[status]} cor={cor} />;
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
