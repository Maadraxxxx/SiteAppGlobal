import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ConversaChamado, TagChamado } from '@/components/ConversaChamado';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useChamado, useResponderChamado } from '@/hooks/useChamados';
import { ROTAS } from '@/lib/rotas';
import { useTheme } from '@/hooks/use-theme';

export default function ChamadoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useChamado(id);
  const responder = useResponderChamado();
  const theme = useTheme();

  if (isLoading) {
    return (
      <Screen style={styles.centro}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen style={styles.centro}>
        <Ionicons name="alert-circle-outline" size={40} color={theme.textSecondary} />
        <ThemedText type="smallBold">Não foi possível abrir esta conversa</ThemedText>
      </Screen>
    );
  }

  const chamado = data.chamado;

  return (
    <Screen maxWidth={720} style={styles.tela}>
      <View style={styles.cabecalho}>
        <ThemedText type="subtitle">{chamado.assunto}</ThemedText>
        <TagChamado status={chamado.status} />
      </View>

      {chamado.pedidoId ? (
        <Pressable
          onPress={() => router.push(ROTAS.pedido(chamado.pedidoId as string))}
          style={({ pressed }) => [
            styles.pedido,
            { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Ionicons name="receipt-outline" size={16} color={theme.primary} />
          <ThemedText type="small" style={styles.pedidoTexto}>
            Sobre o pedido #{chamado.pedidoId.slice(0, 8)}
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </Pressable>
      ) : null}

      <ConversaChamado
        mensagens={chamado.mensagens}
        onEnviar={(texto) => responder.mutateAsync({ id: chamado.id, texto })}
        enviando={responder.isPending}
        encerrada={chamado.status === 'RESOLVIDO'}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: { gap: Spacing.three },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  cabecalho: { gap: Spacing.two },
  pedido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  pedidoTexto: { flex: 1 },
});
