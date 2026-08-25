import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen, useMostrarBarraDeRolagem } from '@/components/Screen';
import { StatusPedidoTag } from '@/components/StatusPedidoTag';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useMeusPedidos } from '@/hooks/usePedidos';
import { ROTAS } from '@/lib/rotas';
import { useTheme } from '@/hooks/use-theme';

function moeda(valor: string | number) {
  const [inteiro, centavos] = (Number(valor) || 0).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

function data(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PedidosScreen() {
  const { usuario } = useAuth();
  const { data: dados, isLoading } = useMeusPedidos();
  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();

  if (!usuario) {
    return (
      <Screen style={styles.centered}>
        <Ionicons name="receipt-outline" size={40} color={theme.textSecondary} />
        <ThemedText type="smallBold">Entre para ver seus pedidos</ThemedText>
        <View style={styles.acao}>
          <Button title="Entrar" onPress={() => router.push('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator />
      </Screen>
    );
  }

  const pedidos = dados?.items ?? [];

  if (!pedidos.length) {
    return (
      <Screen style={styles.centered}>
        <Ionicons name="receipt-outline" size={40} color={theme.textSecondary} />
        <ThemedText type="smallBold">Você ainda não tem pedidos</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
          Quando você fechar uma compra, ela aparece aqui com o acompanhamento.
        </ThemedText>
        <View style={styles.acao}>
          <Button title="Ver catálogo" onPress={() => router.replace('/(tabs)/catalogo')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} maxWidth={800} style={styles.screen}>
      <FlatList
          showsVerticalScrollIndicator={mostrarBarra}
        data={pedidos}
        keyExtractor={(item) => item.id}
        style={styles.lista}
        contentContainerStyle={styles.listaConteudo}
        renderItem={({ item }) => {
          const aguardando = item.status === 'AGUARDANDO_PAGAMENTO';
          const podeRastrear = !aguardando && item.status !== 'CANCELADO';
          const capa = item.itens.find((i) => i.produto?.imagemUrl)?.produto?.imagemUrl;

          return (
            <Pressable
              onPress={() =>
                aguardando
                  ? router.push(ROTAS.pagamento(item.id))
                  : podeRastrear
                    ? router.push(ROTAS.rastreio(item.id))
                    : undefined
              }
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: theme.backgroundElement, opacity: pressed && (aguardando || podeRastrear) ? 0.7 : 1 },
              ]}>
              <View style={styles.cardTopo}>
                {capa ? (
                  <Image source={{ uri: capa }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: theme.secondary }]} />
                )}
                <View style={styles.cardTexto}>
                  <ThemedText type="smallBold">
                    {item.itens.length} {item.itens.length === 1 ? 'item' : 'itens'} · {moeda(item.total)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {data(item.createdAt)}
                  </ThemedText>
                  <StatusPedidoTag status={item.status} />
                </View>
              </View>

              {aguardando ? (
                <View style={[styles.chamada, { borderColor: theme.border }]}>
                  <Ionicons name="qr-code-outline" size={16} color={theme.primary} />
                  <ThemedText type="small" themeColor="primary">
                    Finalizar pagamento
                  </ThemedText>
                </View>
              ) : podeRastrear ? (
                <View style={[styles.chamada, { borderColor: theme.border }]}>
                  <Ionicons name="cube-outline" size={16} color={theme.primary} />
                  <ThemedText type="small" themeColor="primary">
                    {item.codigoRastreio ? 'Acompanhar entrega' : 'Ver andamento'}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  centralizado: {
    textAlign: 'center',
  },
  acao: {
    width: '100%',
    marginTop: Spacing.three,
  },
  lista: {
    flex: 1,
  },
  listaConteudo: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.three,
  },
  cardTopo: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.small,
  },
  cardTexto: {
    flex: 1,
    gap: Spacing.half,
    alignItems: 'flex-start',
  },
  chamada: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
});
