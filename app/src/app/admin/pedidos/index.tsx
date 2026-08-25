import type { Pedido, StatusPedido } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ROTULO_STATUS, StatusPedidoTag } from '@/components/StatusPedidoTag';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAdminPedidos, useAtualizarStatusPedido } from '@/hooks/usePedidos';
import { useTheme } from '@/hooks/use-theme';

// Sem AGUARDANDO_PAGAMENTO: quem muda pra pago e o retorno do Mercado Pago,
// nao o admin na mao.
const STATUS_EDITAVEIS: StatusPedido[] = ['PAGO', 'EM_PRODUCAO', 'ENVIADO', 'CONCLUIDO', 'CANCELADO'];

function moeda(valor: string | number) {
  const [inteiro, centavos] = (Number(valor) || 0).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminPedidosScreen() {
  const { data, isLoading } = useAdminPedidos();
  const atualizar = useAtualizarStatusPedido();
  const [aberto, setAberto] = useState<Pedido | null>(null);
  const [error, setError] = useState<string>();
  const theme = useTheme();

  async function handleStatus(status: StatusPedido) {
    if (!aberto) return;
    setError(undefined);
    try {
      await atualizar.mutateAsync({ id: aberto.id, status });
      setAberto(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível mudar o status');
    }
  }

  if (isLoading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator />
      </Screen>
    );
  }

  const pedidos = data?.items ?? [];

  return (
    <Screen scroll={false} maxWidth={900} style={styles.screen}>
      {pedidos.length ? (
        <FlatList
          data={pedidos}
          keyExtractor={(item) => item.id}
          style={styles.lista}
          contentContainerStyle={styles.listaConteudo}
          renderItem={({ item }) => {
            // Capa = foto do primeiro item que tiver imagem.
            const capa = item.itens.find((i) => i.produto?.imagemUrl)?.produto?.imagemUrl;
            const extras = item.itens.length - 1;

            return (
              <Pressable
                onPress={() => setAberto(item)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}>
                <View style={styles.cardTopo}>
                  <View>
                    {capa ? (
                      <Image source={{ uri: capa }} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, { backgroundColor: theme.secondary }]} />
                    )}
                    {/* Pedido com mais de um produto: marca quantos ficaram de fora da capa. */}
                    {extras > 0 ? (
                      <View style={[styles.contador, { backgroundColor: theme.primary }]}>
                        <ThemedText type="small" themeColor="primaryText" style={styles.contadorTexto}>
                          +{extras}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardTexto}>
                    <View style={styles.cardLinha}>
                      <ThemedText type="smallBold">{moeda(item.total)}</ThemedText>
                      <StatusPedidoTag status={item.status} />
                    </View>
                    <ThemedText type="small" numberOfLines={1}>
                      {item.itens[0]?.produto?.nome ?? 'Produto removido'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {item.usuario.nome} · {dataHora(item.createdAt)}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={styles.centered}>
          <Ionicons name="receipt-outline" size={40} color={theme.textSecondary} />
          <ThemedText type="smallBold">Nenhum pedido ainda</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
            Os pedidos dos clientes aparecem aqui assim que forem feitos.
          </ThemedText>
        </View>
      )}

      <Modal visible={!!aberto} animationType="slide" transparent onRequestClose={() => setAberto(null)}>
        <Pressable style={styles.backdrop} onPress={() => setAberto(null)} />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.sheetTopo}>
            <ThemedText type="subtitle">Pedido</ThemedText>
            <Pressable onPress={() => setAberto(null)} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.sheetConteudo}>
            {aberto ? (
              <>
                <View style={styles.bloco}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Cliente
                  </ThemedText>
                  <ThemedText type="smallBold">{aberto.usuario.nome}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {aberto.usuario.email}
                  </ThemedText>
                </View>

                <View style={styles.bloco}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Itens
                  </ThemedText>
                  {aberto.itens.map((item) => (
                    <View key={item.id} style={styles.itemComFoto}>
                      {item.geracaoImagem?.imagemUrl || item.produto?.imagemUrl ? (
                        <Image
                          source={{ uri: item.geracaoImagem?.imagemUrl ?? (item.produto?.imagemUrl as string) }}
                          style={styles.itemThumb}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.itemThumb, { backgroundColor: theme.secondary }]} />
                      )}
                      <View style={styles.itemNome}>
                        <ThemedText type="small" numberOfLines={2}>
                          {item.quantidade}x {item.produto?.nome ?? 'Produto removido'}
                        </ThemedText>
                        {item.geracaoImagem ? (
                          <ThemedText type="small" themeColor="primary" numberOfLines={1}>
                            Arte personalizada: {item.geracaoImagem.tema}
                          </ThemedText>
                        ) : null}
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {moeda(Number(item.precoUnitario) * item.quantidade)}
                      </ThemedText>
                    </View>
                  ))}
                  {aberto.freteValor ? (
                    <View style={styles.itemLinha}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.itemNome}>
                        Frete · {aberto.freteTransportadora} {aberto.freteServico}
                        {aberto.fretePrazoDias ? ` (${aberto.fretePrazoDias} dias úteis)` : ''}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {moeda(aberto.freteValor)}
                      </ThemedText>
                    </View>
                  ) : null}

                  <View style={[styles.itemLinha, styles.totalLinha, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">Total</ThemedText>
                    <ThemedText type="smallBold" themeColor="primary">
                      {moeda(aberto.total)}
                    </ThemedText>
                  </View>
                </View>

                {aberto.cepDestino ? (
                  <View style={styles.bloco}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Entrega
                    </ThemedText>
                    <ThemedText type="smallBold">CEP {aberto.cepDestino}</ThemedText>
                  </View>
                ) : null}

                <View style={styles.bloco}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Mudar status
                  </ThemedText>
                  <View style={styles.statusGrade}>
                    {STATUS_EDITAVEIS.map((status) => (
                      <Pressable
                        key={status}
                        onPress={() => handleStatus(status)}
                        disabled={atualizar.isPending}
                        style={[
                          styles.statusOpcao,
                          {
                            backgroundColor:
                              aberto.status === status ? theme.primary : theme.backgroundElement,
                            borderColor: aberto.status === status ? theme.primary : theme.border,
                          },
                        ]}>
                        <ThemedText
                          type="small"
                          themeColor={aberto.status === status ? 'primaryText' : 'text'}>
                          {ROTULO_STATUS[status]}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {error ? (
                  <ThemedText type="small" themeColor="danger">
                    {error}
                  </ThemedText>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          <Button title="Fechar" variant="ghost" onPress={() => setAberto(null)} />
        </View>
      </Modal>
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
  },
  cardTopo: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  cardTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  cardLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.small,
  },
  contador: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  contadorTexto: {
    fontSize: 11,
    lineHeight: 14,
  },
  itemComFoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemThumb: {
    width: 36,
    height: 36,
    borderRadius: Radius.small,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    maxHeight: '80%',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sheetTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetConteudo: {
    gap: Spacing.four,
  },
  bloco: {
    gap: Spacing.one,
  },
  itemLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemNome: {
    flex: 1,
  },
  totalLinha: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  statusGrade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  statusOpcao: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
