import type { PainelFinanceiro, TotalDoPeriodo } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { usePainelFinanceiro } from '@/hooks/usePedidos';
import { useTheme } from '@/hooks/use-theme';

/** Altura do gráfico de barras. Fixa: as barras são proporcionais entre si. */
const ALTURA_GRAFICO = 120;

function moeda(valor: string | number) {
  const [inteiro, centavos] = (Number(valor) || 0).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

/** "2026-08" vira "ago" — no eixo do gráfico só cabe o mês abreviado. */
function mesCurto(chave: string) {
  const [ano, mes] = chave.split('-').map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.secao}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.secaoTitulo}>
        {titulo.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

function CartaoPeriodo({ rotulo, dados }: { rotulo: string; dados: TotalDoPeriodo }) {
  const theme = useTheme();

  return (
    <View style={[styles.periodo, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {rotulo}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={1} adjustsFontSizeToFit style={styles.periodoValor}>
        {moeda(dados.receita)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {dados.pedidos} {dados.pedidos === 1 ? 'pedido' : 'pedidos'}
      </ThemedText>
    </View>
  );
}

/** Barras proporcionais ao maior mês. Sem biblioteca: são Views com altura. */
function Grafico({ dados }: { dados: PainelFinanceiro['porMes'] }) {
  const theme = useTheme();
  const maior = Math.max(...dados.map((d) => Number(d.receita)), 0);

  if (maior <= 0) {
    return (
      <View style={[styles.vazio, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Ainda não há vendas pagas pra desenhar o histórico.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.grafico, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.barras}>
        {dados.map((linha) => {
          const valor = Number(linha.receita);
          // Piso de 2px: um mês com venda pequena tem que aparecer, senão some
          // e parece que não vendeu nada.
          const altura = valor > 0 ? Math.max(2, (valor / maior) * ALTURA_GRAFICO) : 0;

          return (
            <View key={linha.mes} style={styles.coluna}>
              <View style={styles.trilho}>
                <View
                  style={[
                    styles.barra,
                    { height: altura, backgroundColor: valor > 0 ? theme.primary : 'transparent' },
                  ]}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.mesRotulo}>
                {mesCurto(linha.mes)}
              </ThemedText>
            </View>
          );
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Maior mês: {moeda(maior)}
      </ThemedText>
    </View>
  );
}

/** Barra de proporção entre duas partes, com legenda. */
function Composicao({ produtos, frete }: { produtos: number; frete: number }) {
  const theme = useTheme();
  const total = produtos + frete;

  return (
    <View style={[styles.bloco, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.proporcao}>
        <View style={{ flex: total > 0 ? produtos : 1, backgroundColor: theme.primary }} />
        <View style={{ flex: total > 0 ? frete : 0, backgroundColor: theme.secondary }} />
      </View>
      <View style={styles.legenda}>
        <View style={styles.legendaItem}>
          <View style={[styles.ponto, { backgroundColor: theme.primary }]} />
          <ThemedText type="small">Produtos {moeda(produtos)}</ThemedText>
        </View>
        <View style={styles.legendaItem}>
          <View style={[styles.ponto, { backgroundColor: theme.secondary }]} />
          <ThemedText type="small">Frete {moeda(frete)}</ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        O frete entra e sai — só a parte de produtos é receita da loja.
      </ThemedText>
    </View>
  );
}

function Linha({ esquerda, direita, nota }: { esquerda: string; direita: string; nota?: string }) {
  return (
    <View style={styles.linha}>
      <View style={styles.linhaTexto}>
        <ThemedText type="small" numberOfLines={1}>
          {esquerda}
        </ThemedText>
        {nota ? (
          <ThemedText type="small" themeColor="textSecondary">
            {nota}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="smallBold">{direita}</ThemedText>
    </View>
  );
}

export default function FinanceiroScreen() {
  const { data, isLoading, isError } = usePainelFinanceiro();
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
        <ThemedText type="smallBold">Não deu pra carregar os números</ThemedText>
      </Screen>
    );
  }

  const p = data.painel;

  return (
    <Screen maxWidth={900} style={styles.tela}>
      <ThemedText type="small" themeColor="textSecondary">
        Tudo aqui conta só pedido pago — é dinheiro que entrou de verdade.
      </ThemedText>

      <Secao titulo="Entrou">
        <View style={styles.periodos}>
          <CartaoPeriodo rotulo="Hoje" dados={p.hoje} />
          <CartaoPeriodo rotulo="7 dias" dados={p.semana} />
          <CartaoPeriodo rotulo="Este mês" dados={p.mes} />
          <CartaoPeriodo rotulo="Este ano" dados={p.ano} />
        </View>
      </Secao>

      <Secao titulo="Receita por mês">
        <Grafico dados={p.porMes} />
      </Secao>

      <Secao titulo="Composição do faturamento">
        <Composicao produtos={Number(p.composicao.produtos)} frete={Number(p.composicao.frete)} />
      </Secao>

      <Secao titulo="Indicadores">
        <View style={[styles.bloco, { backgroundColor: theme.backgroundElement }]}>
          <Linha esquerda="Ticket médio" direita={moeda(p.ticketMedio)} nota="Receita do ano ÷ pedidos do ano" />
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          <Linha
            esquerda="A receber"
            direita={moeda(p.aReceber.valor)}
            nota={`${p.aReceber.pedidos} ${p.aReceber.pedidos === 1 ? 'pedido aguardando' : 'pedidos aguardando'} pagamento`}
          />
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          <Linha
            esquerda="Cancelados"
            direita={moeda(p.cancelados.valor)}
            nota={`${p.cancelados.pedidos} ${p.cancelados.pedidos === 1 ? 'pedido' : 'pedidos'} — não entrou`}
          />
        </View>
      </Secao>

      <Secao titulo="Mais vendidos">
        {p.topProdutos.length ? (
          <View style={[styles.bloco, { backgroundColor: theme.backgroundElement }]}>
            {p.topProdutos.map((produto, i) => (
              <Fragment key={produto.nome}>
                {i > 0 ? <View style={[styles.divisor, { backgroundColor: theme.border }]} /> : null}
                <Linha
                  esquerda={produto.nome}
                  direita={moeda(produto.receita)}
                  nota={`${produto.quantidade} ${produto.quantidade === 1 ? 'unidade' : 'unidades'}`}
                />
              </Fragment>
            ))}
          </View>
        ) : (
          <View style={[styles.vazio, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Nenhum produto vendido ainda.
            </ThemedText>
          </View>
        )}
      </Secao>

      <Secao titulo="Como pagaram">
        {p.porMetodo.length ? (
          <View style={[styles.bloco, { backgroundColor: theme.backgroundElement }]}>
            {p.porMetodo.map((metodo, i) => (
              <Fragment key={metodo.metodo}>
                {i > 0 ? <View style={[styles.divisor, { backgroundColor: theme.border }]} /> : null}
                <Linha
                  esquerda={metodo.metodo === 'PIX' ? 'PIX' : 'Cartão'}
                  direita={moeda(metodo.valor)}
                  nota={`${metodo.pedidos} ${metodo.pedidos === 1 ? 'pagamento' : 'pagamentos'}`}
                />
              </Fragment>
            ))}
          </View>
        ) : (
          <View style={[styles.vazio, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Nenhum pagamento aprovado ainda.
            </ThemedText>
          </View>
        )}
      </Secao>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: {
    gap: Spacing.four,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  secao: {
    gap: Spacing.two,
  },
  secaoTitulo: {
    letterSpacing: 0.6,
  },
  periodos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  periodo: {
    flexGrow: 1,
    flexBasis: 150,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.half,
  },
  periodoValor: {
    fontSize: 20,
    lineHeight: 26,
  },
  grafico: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.two,
  },
  barras: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
  },
  coluna: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },
  trilho: {
    height: ALTURA_GRAFICO,
    justifyContent: 'flex-end',
    width: '100%',
  },
  barra: {
    width: '100%',
    borderTopLeftRadius: Radius.small,
    borderTopRightRadius: Radius.small,
  },
  mesRotulo: {
    fontSize: 10,
  },
  bloco: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  proporcao: {
    flexDirection: 'row',
    height: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  legenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  vazio: {
    padding: Spacing.four,
    borderRadius: Radius.medium,
    alignItems: 'center',
  },
});
