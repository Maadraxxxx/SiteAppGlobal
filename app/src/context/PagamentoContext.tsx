import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { pedidosApi } from '@/api/pedidos';
import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/hooks/use-theme';
import { pagamentoStorage } from '@/lib/storage';

/** De quanto em quanto tempo perguntamos ao servidor se o PIX caiu. */
const INTERVALO_MS = 5000;

function moeda(valor: string | number) {
  const [inteiro, centavos] = (Number(valor) || 0).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

interface PagamentoContextValue {
  /** Passa a acompanhar este pedido até o pagamento cair. */
  observar: (pedidoId: string) => void;
}

const PagamentoContext = createContext<PagamentoContextValue | undefined>(undefined);

/**
 * Vigia o pagamento em segundo plano e avisa em qualquer tela.
 *
 * O PIX pode levar minutos, e ninguém fica parado olhando o QR: a pessoa volta
 * pro catálogo, abre o perfil, sai do app. Antes, a confirmação só aparecia pra
 * quem estivesse justamente na tela do pagamento — nas outras, a compra era
 * aprovada em silêncio.
 *
 * Fica acima das abas, no layout raiz, pra o aviso poder cobrir qualquer tela.
 */
export function PagamentoProvider({ children }: PropsWithChildren) {
  const { removerItens } = useCart();
  const queryClient = useQueryClient();
  const theme = useTheme();

  const [observado, setObservado] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<{ total: string } | null>(null);
  // Guarda o id entre execuções do efeito sem reiniciar a consulta a cada render.
  const jaAvisou = useRef<string | null>(null);

  // Retoma ao abrir o app: quem gerou o PIX e fechou tudo antes de pagar
  // precisa ser avisado do mesmo jeito quando voltar.
  useEffect(() => {
    pagamentoStorage.get().then((id) => {
      if (id) setObservado(id);
    });
  }, []);

  function observar(pedidoId: string) {
    setObservado(pedidoId);
    void pagamentoStorage.set(pedidoId);
  }

  async function parar() {
    setObservado(null);
    await pagamentoStorage.clear();
  }

  useEffect(() => {
    if (!observado || jaAvisou.current === observado) return;

    let ativo = true;

    async function conferir() {
      try {
        const { pagamento } = await pedidosApi.consultarPagamento(observado as string);
        if (!ativo || pagamento.status !== 'APROVADO') return;

        jaAvisou.current = observado;

        // Busca o pedido pra saber o que sai do carrinho e quanto foi pago.
        const { pedido } = await pedidosApi.get(observado as string);
        if (!ativo) return;

        // Só os itens daquele pedido: o que o cliente escolheu enquanto
        // esperava o PIX cair continua no carrinho.
        await removerItens(
          pedido.itens.map((item) => `${item.produto?.id ?? ''}|${item.geracaoImagem?.id ?? ''}`),
        );
        // As listas em cache ainda mostram o pedido como aguardando.
        queryClient.invalidateQueries({ queryKey: ['meus-pedidos'] });
        queryClient.invalidateQueries({ queryKey: ['pedido', observado] });

        setConfirmado({ total: pedido.total });
        await parar();
      } catch {
        // Rede oscilando ou pedido já apagado: tenta de novo no próximo ciclo,
        // sem estourar erro na cara de quem está navegando.
      }
    }

    void conferir();
    const timer = setInterval(conferir, INTERVALO_MS);
    return () => {
      ativo = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observado]);

  function irPara(destino: '/pedidos' | '/(tabs)/catalogo') {
    setConfirmado(null);
    router.replace(destino);
  }

  return (
    <PagamentoContext.Provider value={{ observar }}>
      {children}

      <Modal visible={!!confirmado} transparent animationType="fade">
        <View style={styles.fundo}>
          <View style={[styles.caixa, { backgroundColor: theme.background }]}>
            <View style={[styles.selo, { backgroundColor: theme.success }]}>
              <Ionicons name="checkmark" size={34} color="#FFFFFF" />
            </View>

            <ThemedText type="subtitle" style={styles.centralizado}>
              Pagamento concluído!
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
              Recebemos {moeda(confirmado?.total ?? 0)}. Seu pedido já entrou na fila
              de produção.
            </ThemedText>

            <View style={styles.acoes}>
              <Button title="Ver meus pedidos" onPress={() => irPara('/pedidos')} />
              <Button
                title="Continuar comprando"
                variant="ghost"
                onPress={() => irPara('/(tabs)/catalogo')}
              />
            </View>
          </View>
        </View>
      </Modal>
    </PagamentoContext.Provider>
  );
}

export function usePagamento() {
  const ctx = useContext(PagamentoContext);
  if (!ctx) throw new Error('usePagamento precisa estar dentro de PagamentoProvider');
  return ctx;
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  caixa: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.large,
  },
  selo: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  centralizado: {
    textAlign: 'center',
  },
  acoes: {
    width: '100%',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
