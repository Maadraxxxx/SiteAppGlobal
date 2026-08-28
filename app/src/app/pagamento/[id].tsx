import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { pedidosApi } from '@/api/pedidos';
import { useCart } from '@/context/CartContext';
import { usePagamentoDoPedido, usePedido } from '@/hooks/usePedidos';
import { usePrazo } from '@/lib/prazo';
import { useTheme } from '@/hooks/use-theme';

function moeda(valor: string | number) {
  const [inteiro, centavos] = (Number(valor) || 0).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

export default function PagamentoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const pedido = usePedido(id);
  const { removerItens } = useCart();
  const [gerando, setGerando] = useState(false);
  const [error, setError] = useState<string>();
  const [copiado, setCopiado] = useState(false);
  const [pixCriado, setPixCriado] = useState(false);

  const pagamentoExistente = pedido.data?.pedido.pagamentos?.[0];
  const jaTemPix = pixCriado || !!pagamentoExistente?.qrCodeCopiaCola;

  // So fica perguntando ao servidor enquanto o pagamento nao resolveu.
  const consulta = usePagamentoDoPedido(id, jaTemPix);
  const pagamento = consulta.data?.pagamento ?? pagamentoExistente;
  const aprovado = pagamento?.status === 'APROVADO';
  const prazo = usePrazo(aprovado ? null : pedido.data?.pedido.expiraEm);

  /**
   * O carrinho só esvazia quando o pagamento é confirmado — e só os itens
   * daquele pedido. Quem abre o PIX e desiste continua achando os produtos
   * onde deixou.
   *
   * Os dois refs evitam mexer no carrinho fora da hora: `viuPendente` garante
   * que a confirmação aconteceu com a tela aberta (abrir um pedido pago de
   * ontem não pode limpar o carrinho de hoje), e `jaLimpou` impede repetir a
   * cada nova consulta ao servidor.
   */
  const viuPendente = useRef(false);
  const jaLimpou = useRef(false);

  useEffect(() => {
    if (!aprovado) {
      viuPendente.current = true;
      return;
    }
    if (!viuPendente.current || jaLimpou.current) return;

    const itens = pedido.data?.pedido.itens;
    if (!itens?.length) return;

    jaLimpou.current = true;
    void removerItens(
      itens.map((item) => `${item.produto?.id ?? ''}|${item.geracaoImagem?.id ?? ''}`),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aprovado]);

  async function handleGerarPix() {
    setError(undefined);
    setGerando(true);
    try {
      await pedidosApi.criarPix(id);
      setPixCriado(true);
      await pedido.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel gerar o PIX');
    } finally {
      setGerando(false);
    }
  }

  async function handleCopiar() {
    if (!pagamento?.qrCodeCopiaCola) return;
    await Clipboard.setStringAsync(pagamento.qrCodeCopiaCola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (pedido.isLoading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (pedido.isError || !pedido.data) {
    return (
      <Screen style={styles.centered}>
        <ThemedText themeColor="textSecondary">Pedido não encontrado.</ThemedText>
      </Screen>
    );
  }

  if (aprovado) {
    return (
      <Screen maxWidth={640} style={styles.centered}>
        <View style={[styles.selo, { backgroundColor: theme.success }]}>
          <Ionicons name="checkmark" size={36} color="#FFFFFF" />
        </View>
        <ThemedText type="subtitle">Pagamento confirmado!</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
          Recebemos {moeda(pedido.data.pedido.total)}. Seu pedido já entrou na fila de produção.
        </ThemedText>
        <View style={styles.acao}>
          <Button title="Ver meus pedidos" onPress={() => router.replace('/pedidos')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen maxWidth={640} style={styles.screen}>
      <View style={[styles.resumo, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Total a pagar
        </ThemedText>
        <ThemedText type="subtitle" style={styles.total}>
          {moeda(pedido.data.pedido.total)}
        </ThemedText>
      </View>

      {/* O pedido é cancelado sozinho quando o prazo acaba. Aqui, com o QR na
          mão, é onde o relógio mais precisa aparecer. */}
      {prazo ? (
        <View
          style={[
            styles.prazo,
            {
              borderColor: prazo.urgente ? theme.danger : theme.border,
              backgroundColor: prazo.urgente ? theme.backgroundElement : 'transparent',
            },
          ]}>
          <Ionicons
            name={prazo.vencido ? 'close-circle-outline' : 'time-outline'}
            size={18}
            color={prazo.urgente ? theme.danger : theme.textSecondary}
          />
          <ThemedText
            type={prazo.urgente ? 'smallBold' : 'small'}
            style={[styles.prazoTexto, { color: prazo.urgente ? theme.danger : theme.textSecondary }]}>
            {prazo.vencido
              ? 'O prazo deste pedido acabou. Ele foi cancelado — faça um novo pedido para comprar.'
              : `Você tem ${prazo.texto} para pagar. Passado o prazo, o pedido é cancelado automaticamente.`}
          </ThemedText>
        </View>
      ) : null}

      {!jaTemPix ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            Escolha como pagar:
          </ThemedText>

          <Pressable
            onPress={handleGerarPix}
            disabled={gerando}
            style={({ pressed }) => [
              styles.metodo,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}>
            <View style={[styles.metodoIcone, { backgroundColor: theme.primary }]}>
              <Ionicons name="qr-code-outline" size={20} color={theme.primaryText} />
            </View>
            <View style={styles.metodoTexto}>
              <ThemedText type="smallBold">PIX</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                QR code na hora, sem sair do app
              </ThemedText>
            </View>
            {gerando ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            )}
          </Pressable>

          <View style={[styles.metodo, styles.metodoInativo, { borderColor: theme.border }]}>
            <View style={[styles.metodoIcone, { backgroundColor: theme.backgroundSelected }]}>
              <Ionicons name="card-outline" size={20} color={theme.textSecondary} />
            </View>
            <View style={styles.metodoTexto}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Cartão
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Em breve
              </ThemedText>
            </View>
          </View>
        </>
      ) : (
        <View style={styles.pix}>
          <ThemedText type="smallBold">Pague com PIX</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
            Abra o app do seu banco, escaneie o código abaixo ou use o copia e cola.
          </ThemedText>

          {pagamento?.qrCodeBase64 ? (
            <Image
              source={{ uri: `data:image/png;base64,${pagamento.qrCodeBase64}` }}
              style={styles.qr}
              contentFit="contain"
            />
          ) : (
            <View style={[styles.qr, styles.qrVazio, { backgroundColor: theme.backgroundElement }]}>
              <ActivityIndicator color={theme.primary} />
            </View>
          )}

          {pagamento?.qrCodeCopiaCola ? (
            <>
              <View style={[styles.codigo, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" numberOfLines={2} style={styles.codigoTexto}>
                  {pagamento.qrCodeCopiaCola}
                </ThemedText>
              </View>
              <Button title={copiado ? 'Copiado!' : 'Copiar código'} variant="ghost" onPress={handleCopiar} />
            </>
          ) : null}

          <View style={[styles.aguardando, { backgroundColor: theme.backgroundSelected }]}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText type="small">Aguardando confirmação do pagamento...</ThemedText>
          </View>
        </View>
      )}

      {error ? (
        <ThemedText type="small" themeColor="danger" style={styles.centralizado}>
          {error}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.three,
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
  prazo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  prazoTexto: {
    flex: 1,
  },
  resumo: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.half,
  },
  total: {
    fontSize: 28,
    lineHeight: 34,
  },
  metodo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  metodoInativo: {
    borderWidth: 1,
    opacity: 0.6,
  },
  metodoIcone: {
    width: 40,
    height: 40,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metodoTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  pix: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  qr: {
    width: 240,
    height: 240,
    borderRadius: Radius.medium,
  },
  qrVazio: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  codigo: {
    width: '100%',
    padding: Spacing.three,
    borderRadius: Radius.small,
  },
  codigoTexto: {
    fontSize: 12,
  },
  aguardando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  selo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  acao: {
    width: '100%',
    marginTop: Spacing.three,
  },
});
