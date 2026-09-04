import type { PainelFinanceiro, TotalDoPeriodo } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { ROTAS } from '@/lib/rotas';
import { usePainelFinanceiro } from '@/hooks/usePedidos';
import { useTheme } from '@/hooks/use-theme';

/** Altura do gráfico de barras. Fixa: as barras são proporcionais entre si. */
const ALTURA_GRAFICO = 120;

type ChavePeriodo = 'hoje' | 'semana' | 'mes' | 'ano';

const PERIODOS: { chave: ChavePeriodo; rotulo: string; descricao: string }[] = [
  { chave: 'hoje', rotulo: 'Hoje', descricao: 'no dia de hoje' },
  { chave: 'semana', rotulo: '7 dias', descricao: 'nos últimos 7 dias' },
  { chave: 'mes', rotulo: 'Mês', descricao: 'no mês corrente' },
  { chave: 'ano', rotulo: 'Ano', descricao: 'no ano corrente' },
];

function moeda(valor: string | number) {
  const [inteiro, centavos] = (Number(valor) || 0).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

function percentual(parte: number, total: number) {
  if (total <= 0) return '0%';
  return `${Math.round((parte / total) * 100)}%`;
}

/** "2026-08" vira "ago" — no eixo do gráfico só cabe o mês abreviado. */
function mesCurto(chave: string) {
  const [ano, mes] = chave.split('-').map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

/**
 * "2026-08" vira "Agosto de 2026" — por extenso, fora do eixo.
 *
 * A maiuscula sai daqui, e nao do textTransform do CSS: 'capitalize' sobe a
 * inicial de toda palavra e escrevia "Agosto De 2026".
 */
function mesPorExtenso(chave: string) {
  const [ano, mes] = chave.split('-').map(Number);
  const texto = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function Secao({
  titulo,
  legenda,
  children,
}: {
  titulo: string;
  /** Explica o critério do bloco. Fica sob o título, e não solto na tela. */
  legenda?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.secao}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.secaoTitulo}>
        {titulo.toUpperCase()}
      </ThemedText>
      {legenda ? (
        <ThemedText type="small" themeColor="textSecondary">
          {legenda}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

/**
 * Um período por vez, escolhido pelo admin, com o valor em tamanho de manchete.
 *
 * Antes eram quatro cartões lado a lado com o mesmo peso visual. Ficava difícil
 * ler qualquer um deles: nenhum número tinha destaque, e no celular os quatro
 * espremidos apertavam os valores.
 */
function Destaque({ painel }: { painel: PainelFinanceiro }) {
  const theme = useTheme();
  const [ativo, setAtivo] = useState<ChavePeriodo>('mes');

  const periodo = PERIODOS.find((p) => p.chave === ativo) as (typeof PERIODOS)[number];
  const dados = painel[ativo] as TotalDoPeriodo;

  return (
    <View style={styles.destaque}>
      <View style={styles.seletor}>
        {PERIODOS.map((p) => {
          const selecionado = p.chave === ativo;
          return (
            <Pressable
              key={p.chave}
              onPress={() => setAtivo(p.chave)}
              style={({ pressed }) => [
                styles.seletorItem,
                {
                  backgroundColor: selecionado ? theme.primary : theme.backgroundElement,
                  borderColor: selecionado ? theme.primary : theme.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <ThemedText type="small" themeColor={selecionado ? 'primaryText' : 'textSecondary'}>
                {p.rotulo}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.destaqueCartao, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary">
          Receita recebida {periodo.descricao}
        </ThemedText>
        <ThemedText type="title" themeColor="primary" numberOfLines={1} adjustsFontSizeToFit>
          {moeda(dados.receita)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {dados.pedidos} {dados.pedidos === 1 ? 'pedido pago' : 'pedidos pagos'}
        </ThemedText>
      </View>
    </View>
  );
}

/**
 * Barras proporcionais ao maior mês. Sem biblioteca: são Views com altura.
 *
 * Cada barra é tocável, e o mês escolhido tem os números escritos abaixo — o
 * gráfico sozinho mostra a tendência, mas não diz quanto entrou em cada mês.
 */
function Grafico({ dados }: { dados: PainelFinanceiro['porMes'] }) {
  const theme = useTheme();
  const maior = Math.max(...dados.map((d) => Number(d.receita)), 0);

  // Abre no mês mais recente com receita: é o que o admin veio ver. Sem
  // nenhum, no último mês da série.
  const [selecionado, setSelecionado] = useState(() => {
    const comReceita = [...dados].reverse().find((d) => Number(d.receita) > 0);
    return comReceita?.mes ?? dados[dados.length - 1]?.mes;
  });

  if (maior <= 0) {
    return (
      <View style={[styles.vazio, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
          Ainda não há pedidos pagos no período.
        </ThemedText>
      </View>
    );
  }

  const linhaSelecionada = dados.find((d) => d.mes === selecionado);

  return (
    <View style={[styles.grafico, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.barras}>
        {dados.map((linha) => {
          const valor = Number(linha.receita);
          // Piso de 2px: um mês com venda pequena tem que aparecer, senão some
          // e parece que não vendeu nada.
          const altura = valor > 0 ? Math.max(2, (valor / maior) * ALTURA_GRAFICO) : 0;
          const ativo = linha.mes === selecionado;

          return (
            <Pressable
              key={linha.mes}
              onPress={() => setSelecionado(linha.mes)}
              style={styles.coluna}
              accessibilityRole="button"
              accessibilityLabel={`${mesPorExtenso(linha.mes)}: ${moeda(valor)}`}>
              <View style={styles.trilho}>
                <View
                  style={[
                    styles.barra,
                    {
                      height: altura,
                      // O mês não escolhido fica esmaecido em vez de cinza: a
                      // série continua legível como um todo.
                      backgroundColor: valor > 0 ? theme.primary : 'transparent',
                      opacity: ativo ? 1 : 0.35,
                    },
                  ]}
                />
              </View>
              <ThemedText
                type={ativo ? 'smallBold' : 'small'}
                themeColor={ativo ? 'primary' : 'textSecondary'}
                style={styles.mesRotulo}>
                {mesCurto(linha.mes)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {linhaSelecionada ? (
        <View style={[styles.graficoRodape, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {mesPorExtenso(linhaSelecionada.mes)}
          </ThemedText>
          <ThemedText type="smallBold">
            {moeda(linhaSelecionada.receita)} · {linhaSelecionada.pedidos}{' '}
            {linhaSelecionada.pedidos === 1 ? 'pedido' : 'pedidos'}
          </ThemedText>
        </View>
      ) : null}
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
          <ThemedText type="small">
            Produtos {moeda(produtos)} ({percentual(produtos, total)})
          </ThemedText>
        </View>
        <View style={styles.legendaItem}>
          <View style={[styles.ponto, { backgroundColor: theme.secondary }]} />
          <ThemedText type="small">
            Frete {moeda(frete)} ({percentual(frete, total)})
          </ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        O valor do frete é repassado à transportadora. A receita da loja é a parcela de produtos.
      </ThemedText>
    </View>
  );
}

function Linha({
  esquerda,
  direita,
  nota,
  posicao,
  onPress,
}: {
  esquerda: string;
  direita: string;
  nota?: string;
  /** Numera o item quando a lista é um ranking. */
  posicao?: number;
  onPress?: () => void;
}) {
  const theme = useTheme();

  const conteudo = (
    <>
      {posicao ? (
        <View style={[styles.posicao, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {posicao}
          </ThemedText>
        </View>
      ) : null}
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
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.linha}>{conteudo}</View>;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linha, { opacity: pressed ? 0.6 : 1 }]}>
      {conteudo}
    </Pressable>
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
        <ThemedText type="smallBold">Não foi possível carregar os dados</ThemedText>
      </Screen>
    );
  }

  const p = data.painel;

  return (
    <Screen maxWidth={900} style={styles.tela}>
      <Destaque painel={p} />

      <Secao titulo="Receita por mês" legenda="Toque em um mês para ver os números dele.">
        <Grafico dados={p.porMes} />
      </Secao>

      <Secao titulo="Composição da receita">
        <Composicao produtos={Number(p.composicao.produtos)} frete={Number(p.composicao.frete)} />
      </Secao>

      <Secao titulo="Indicadores">
        <View style={[styles.bloco, { backgroundColor: theme.backgroundElement }]}>
          <Linha
            esquerda="Ticket médio"
            direita={moeda(p.ticketMedio)}
            nota="Receita do ano dividida pelos pedidos do ano"
          />
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          <Linha
            esquerda="A receber"
            direita={moeda(p.aReceber.valor)}
            nota={`${p.aReceber.pedidos} ${p.aReceber.pedidos === 1 ? 'pedido aguardando' : 'pedidos aguardando'} pagamento`}
            // Este é o único número da tela sobre o qual há o que fazer: abre a
            // lista já filtrada nesses pedidos.
            onPress={() => router.push(ROTAS.adminPedidosAguardando)}
          />
          <View style={[styles.divisor, { backgroundColor: theme.border }]} />
          <Linha
            esquerda="Cancelados"
            direita={moeda(p.cancelados.valor)}
            nota={`${p.cancelados.pedidos} ${p.cancelados.pedidos === 1 ? 'pedido' : 'pedidos'} — valor não recebido`}
          />
        </View>
      </Secao>

      <Secao titulo="Produtos mais vendidos">
        {p.topProdutos.length ? (
          <View style={[styles.bloco, { backgroundColor: theme.backgroundElement }]}>
            {p.topProdutos.map((produto, i) => (
              <Fragment key={produto.nome}>
                {i > 0 ? <View style={[styles.divisor, { backgroundColor: theme.border }]} /> : null}
                <Linha
                  posicao={i + 1}
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
              Nenhum produto vendido até o momento.
            </ThemedText>
          </View>
        )}
      </Secao>

      <Secao titulo="Formas de pagamento">
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
              Nenhum pagamento aprovado até o momento.
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
  centralizado: {
    textAlign: 'center',
  },
  secao: {
    gap: Spacing.two,
  },
  secaoTitulo: {
    letterSpacing: 0.6,
  },
  destaque: {
    gap: Spacing.two,
  },
  seletor: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  seletorItem: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  destaqueCartao: {
    padding: Spacing.four,
    borderRadius: Radius.medium,
    gap: Spacing.half,
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
  graficoRodape: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    gap: Spacing.half,
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
  posicao: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
