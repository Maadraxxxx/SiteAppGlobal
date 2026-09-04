import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { ConversaChamado, TagChamado } from '@/components/ConversaChamado';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useChamado, useResponderChamado, useStatusChamado } from '@/hooks/useChamados';
import { ROTAS } from '@/lib/rotas';
import { useTheme } from '@/hooks/use-theme';

export default function AdminChamadoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useChamado(id, true);
  const responder = useResponderChamado(true);
  const status = useStatusChamado();
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
  const resolvido = chamado.status === 'RESOLVIDO';

  return (
    <Screen maxWidth={720} style={styles.tela}>
      <View style={styles.cabecalho}>
        <ThemedText type="subtitle">{chamado.assunto}</ThemedText>
        <TagChamado status={chamado.status} />
      </View>

      <View style={[styles.cliente, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="person-outline" size={16} color={theme.primary} />
        <View style={styles.clienteTexto}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {chamado.usuario.nome}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {chamado.usuario.email}
          </ThemedText>
        </View>
      </View>

      {chamado.pedidoId ? (
        <Pressable
          onPress={() => router.push(ROTAS.adminPedido(chamado.pedidoId as string))}
          style={({ pressed }) => [
            styles.pedido,
            { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
          ]}>
          <Ionicons name="receipt-outline" size={16} color={theme.primary} />
          <ThemedText type="small" style={styles.pedidoTexto}>
            Abrir o pedido #{chamado.pedidoId.slice(0, 8)}
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </Pressable>
      ) : null}

      <ConversaChamado
        mensagens={chamado.mensagens}
        souLoja
        onEnviar={(texto) => responder.mutateAsync({ id: chamado.id, texto })}
        enviando={responder.isPending}
        encerrada={resolvido}
      />

      {/* Encerrar fica no fim, depois da conversa: e a ultima coisa que se faz,
          e no topo competiria com o campo de resposta. */}
      <Button
        title={resolvido ? 'Reabrir atendimento' : 'Marcar como resolvido'}
        variant={resolvido ? 'ghost' : 'secondary'}
        loading={status.isPending}
        onPress={() =>
          status.mutateAsync({ id: chamado.id, status: resolvido ? 'ABERTO' : 'RESOLVIDO' })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: { gap: Spacing.three },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  cabecalho: { gap: Spacing.two },
  cliente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  clienteTexto: { flex: 1, gap: Spacing.half },
  pedido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  pedidoTexto: { flex: 1 },
});
