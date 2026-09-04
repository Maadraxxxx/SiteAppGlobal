import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TagPagamento, TagProducao } from '@/components/StatusPedidoTag';
import { ThemedText } from '@/components/themed-text';
import { VisualizadorDeImagem } from '@/components/VisualizadorDeImagem';
import { Radius, Spacing } from '@/constants/theme';
import { usePedido } from '@/hooks/usePedidos';
import { rotuloDoTema } from '@/lib/tema';
import { usePrazo } from '@/lib/prazo';
import { ROTAS } from '@/lib/rotas';
import { useTheme } from '@/hooks/use-theme';

function moeda(valor: string | number) {
  const [inteiro, centavos] = (Number(valor) || 0).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

/** 17606035 vira 17606-035, como em Meus Endereços. */
function formatarCep(cep: string) {
  const digitos = cep.replace(/\D/g, '');
  return digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : cep;
}

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={styles.bloco}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.blocoTitulo}>
        {titulo.toUpperCase()}
      </ThemedText>
      <View style={[styles.cartao, { backgroundColor: theme.backgroundElement }]}>{children}</View>
    </View>
  );
}

/** Uma linha da conta: descrição à esquerda, valor à direita. */
function Linha({
  texto,
  nota,
  valor,
  destaque,
}: {
  texto: string;
  nota?: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <View style={styles.linha}>
      <View style={styles.linhaTexto}>
        <ThemedText type={destaque ? 'smallBold' : 'small'}>{texto}</ThemedText>
        {nota ? (
          <ThemedText type="small" themeColor="textSecondary">
            {nota}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type={destaque ? 'smallBold' : 'small'} themeColor={destaque ? 'primary' : 'text'}>
        {valor}
      </ThemedText>
    </View>
  );
}

/** Nome do produto e, quando houver, o tema encomendado. */
function legendaDaArte(item: {
  produto?: { nome: string } | null;
  geracaoImagem?: { tema: string } | null;
}) {
  const nome = item.produto?.nome ?? 'Produto removido';
  return item.geracaoImagem ? `${nome} · ${rotuloDoTema(item.geracaoImagem.tema)}` : nome;
}

export default function PedidoScreen() {
  const [ampliada, setAmpliada] = useState<{ uri: string; legenda: string } | null>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = usePedido(id);
  const theme = useTheme();
  const pedido = data?.pedido;
  const prazo = usePrazo(pedido?.expiraEm);

  if (isLoading) {
    return (
      <Screen style={styles.centro}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (isError || !pedido) {
    return (
      <Screen style={styles.centro}>
        <Ionicons name="receipt-outline" size={40} color={theme.textSecondary} />
        <ThemedText type="smallBold">Pedido não encontrado</ThemedText>
      </Screen>
    );
  }

  const aguardando = pedido.statusPagamento === 'AGUARDANDO';
  const pago = pedido.statusPagamento === 'PAGO';
  // O subtotal fica gravado desde o checkout, mas pedido antigo veio com zero.
  // Total menos frete dá o mesmo número e vale pra todos.
  const frete = Number(pedido.freteValor ?? 0);
  const produtos = Number(pedido.total) - frete;

  return (
    <Screen maxWidth={640} style={styles.tela}>
      <View style={styles.topo}>
        <View style={styles.tags}>
          <TagPagamento status={pedido.statusPagamento} />
          {pago ? <TagProducao status={pedido.statusProducao} /> : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Pedido #{pedido.id.slice(0, 8)} · {dataHora(pedido.createdAt)}
        </ThemedText>
      </View>

      {aguardando && prazo ? (
        <View style={[styles.aviso, { borderColor: prazo.urgente ? theme.danger : theme.border }]}>
          <Ionicons
            name={prazo.vencido ? 'close-circle-outline' : 'time-outline'}
            size={18}
            color={prazo.urgente ? theme.danger : theme.textSecondary}
          />
          <ThemedText
            type="small"
            style={[styles.avisoTexto, { color: prazo.urgente ? theme.danger : theme.textSecondary }]}>
            {prazo.vencido
              ? 'O prazo de pagamento acabou.'
              : `Faltam ${prazo.texto} para pagar. Depois disso o pedido é cancelado.`}
          </ThemedText>
        </View>
      ) : null}

      <VisualizadorDeImagem
        uri={ampliada?.uri}
        legenda={ampliada?.legenda}
        onFechar={() => setAmpliada(null)}
      />

      <Bloco titulo="Itens">
        {pedido.itens.map((item, i) => {
          const arte = item.geracaoImagem?.imagemUrl ?? item.produto?.imagemUrl;
          const total = Number(item.precoUnitario) * item.quantidade;

          return (
            <View key={item.id}>
              {i > 0 ? <View style={[styles.divisor, { backgroundColor: theme.border }]} /> : null}
              <View style={styles.item}>
                {/* A foto abre ampliada; o resto da linha abre o produto. Sao
                    dois destinos diferentes, e por isso dois toques separados
                    em vez de um so pra linha inteira. */}
                {arte ? (
                  <Pressable
                    onPress={() => setAmpliada({ uri: arte, legenda: legendaDaArte(item) })}
                    accessibilityRole="button"
                    accessibilityLabel="Ver imagem">
                    <Image source={{ uri: arte }} style={styles.thumb} contentFit="cover" />
                  </Pressable>
                ) : (
                  <View style={[styles.thumb, { backgroundColor: theme.secondary }]} />
                )}

                <Pressable
                  onPress={() => item.produto && router.push(`/produto/${item.produto.id}`)}
                  // Produto apagado do catalogo nao tem pagina pra abrir.
                  disabled={!item.produto}
                  style={({ pressed }) => [styles.itemTexto, { opacity: pressed ? 0.6 : 1 }]}
                  accessibilityRole={item.produto ? 'button' : undefined}>
                  <View style={styles.itemNome}>
                    <ThemedText type="small" numberOfLines={2} style={styles.itemNomeTexto}>
                      {item.produto?.nome ?? 'Produto removido'}
                    </ThemedText>
                    {item.produto ? (
                      <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                    ) : null}
                  </View>
                  {item.geracaoImagem ? (
                    <ThemedText type="small" themeColor="primary" numberOfLines={1}>
                      Arte personalizada: {rotuloDoTema(item.geracaoImagem.tema)}
                    </ThemedText>
                  ) : null}
                  <ThemedText type="small" themeColor="textSecondary">
                    {item.quantidade} × {moeda(item.precoUnitario)}
                  </ThemedText>
                </Pressable>

                <ThemedText type="smallBold">{moeda(total)}</ThemedText>
              </View>
            </View>
          );
        })}
      </Bloco>

      {/* A conta separada: produtos de um lado, frete do outro. Junto num
          número só, o cliente não sabe quanto pagou de entrega. */}
      <Bloco titulo="Valores">
        <Linha texto="Produtos" valor={moeda(produtos)} />
        <View style={[styles.divisor, { backgroundColor: theme.border }]} />
        <Linha
          texto="Frete"
          nota={
            pedido.freteTransportadora
              ? `${pedido.freteTransportadora} ${pedido.freteServico ?? ''}${
                  pedido.fretePrazoDias ? ` · até ${pedido.fretePrazoDias} dias úteis` : ''
                }`
              : undefined
          }
          valor={frete > 0 ? moeda(frete) : 'Grátis'}
        />
        <View style={[styles.divisor, { backgroundColor: theme.border }]} />
        <Linha texto="Total" valor={moeda(pedido.total)} destaque />
      </Bloco>

      {pedido.cepDestino ? (
        <Bloco titulo="Entrega">
          <View style={styles.endereco}>
            <ThemedText type="small">
              {[pedido.enderecoLogradouro, pedido.enderecoNumero].filter(Boolean).join(', ')}
              {pedido.enderecoComplemento ? `, ${pedido.enderecoComplemento}` : ''}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[pedido.enderecoBairro, pedido.enderecoCidade].filter(Boolean).join(', ')}
              {pedido.enderecoUf ? `/${pedido.enderecoUf}` : ''}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              CEP {formatarCep(pedido.cepDestino)}
            </ThemedText>
            {pedido.codigoRastreio ? (
              <ThemedText type="smallBold" style={styles.rastreio}>
                Rastreio: {pedido.codigoRastreio}
              </ThemedText>
            ) : null}
          </View>
        </Bloco>
      ) : null}

      {aguardando ? (
        <Button title="Pagar agora" onPress={() => router.push(ROTAS.pagamento(pedido.id))} />
      ) : pago ? (
        <Button
          title={pedido.codigoRastreio ? 'Acompanhar entrega' : 'Ver andamento'}
          variant="ghost"
          onPress={() => router.push(ROTAS.rastreio(pedido.id))}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemNome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  itemNomeTexto: {
    flexShrink: 1,
  },
  tela: {
    gap: Spacing.four,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  topo: {
    gap: Spacing.two,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  avisoTexto: {
    flex: 1,
  },
  bloco: {
    gap: Spacing.two,
  },
  blocoTitulo: {
    letterSpacing: 0.6,
  },
  cartao: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.small,
  },
  itemTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  linhaTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  divisor: {
    height: 1,
  },
  endereco: {
    gap: Spacing.half,
    paddingVertical: Spacing.one,
  },
  rastreio: {
    marginTop: Spacing.two,
  },
});
