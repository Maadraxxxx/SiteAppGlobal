import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TagProducao } from '@/components/StatusPedidoTag';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { ROTAS } from '@/lib/rotas';
import { useAdminPedidos, useResumoPedidosMes } from '@/hooks/usePedidos';
import { useAdminProdutos } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

const RECENTES = 4;


function moeda(valor: string | number) {
  const [inteiro, centavos] = (Number(valor) || 0).toFixed(2).split('.');
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${comMilhar},${centavos}`;
}

function dataCurta(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function nomeDoMes() {
  return new Date().toLocaleDateString('pt-BR', { month: 'long' });
}

function SectionTitle({ titulo, acao }: { titulo: string; acao?: { label: string; onPress: () => void } }) {
  const theme = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitulo}>
        {titulo}
      </ThemedText>
      {acao ? (
        // Mesma pastilha cheia da Home: o link em texto se perdia ao lado do
        // rótulo da seção e não parecia clicável.
        <Pressable
          onPress={acao.onPress}
          hitSlop={8}
          style={({ pressed }) => [
            styles.sectionAcao,
            { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
          ]}>
          <ThemedText type="smallBold" themeColor="primaryText">
            {acao.label}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatCard({
  icon,
  valor,
  label,
  nota,
  acao,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  valor: number;
  label: string;
  nota?: string;
  /** A ação daquele número, dentro do próprio cartão. */
  acao?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();

  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>
      <Ionicons name={icon} size={18} color={theme.primary} />
      <ThemedText type="subtitle" style={styles.statValor}>
        {valor}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      {nota ? (
        <ThemedText type="small" themeColor="danger" numberOfLines={1} style={styles.statNota}>
          {nota}
        </ThemedText>
      ) : null}

      {acao ? (
        // Botão próprio, e não o <Button> comum: aquele tem 24px de padding
        // lateral e o rótulo quebrava em duas linhas dentro de meio cartão.
        // Contornado em vez de sólido pra não disputar com o painel financeiro,
        // que é a única peça laranja cheia da tela.
        <Pressable
          onPress={acao.onPress}
          style={({ pressed }) => [
            styles.statAcao,
            { borderColor: theme.primary, opacity: pressed ? 0.6 : 1 },
          ]}>
          <ThemedText type="smallBold" themeColor="primary" numberOfLines={1}>
            {acao.label}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function AdminDashboard() {
  const theme = useTheme();
  const produtos = useAdminProdutos();
  const pedidos = useResumoPedidosMes();
  const listaPedidos = useAdminPedidos();

  const itens = produtos.data?.items ?? [];
  const totalProdutos = produtos.data?.total ?? 0;
  const inativos = itens.filter((p) => !p.ativo).length;
  // So pagamento finalizado: pedido aguardando ou cancelado nao e venda, e
  // poluiria a lista que o admin usa pra ver o que entrou.
  const recentes = (listaPedidos.data?.items ?? [])
    .filter((p) => p.statusPagamento === 'PAGO')
    .slice(0, RECENTES);
  const resumo = pedidos.data?.resumo;
  const carregando = produtos.isLoading || pedidos.isLoading || listaPedidos.isLoading;

  if (carregando) {
    return (
      <Screen maxWidth={900} style={styles.centered}>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen maxWidth={900} style={styles.screen}>
      <View style={styles.grupo}>
        <SectionTitle titulo={`Resumo de ${nomeDoMes()}`} />

        {/* Um número solto dizia pouco: quanto entrou hoje, o ticket médio, o
            que está por receber — nada disso cabia aqui. Virou porta pro painel
            financeiro, que mostra tudo isso junto. */}
        <Pressable
          onPress={() => router.push(ROTAS.adminFinanceiro)}
          style={({ pressed }) => [
            styles.destaque,
            { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
          ]}>
          <View style={styles.destaqueTexto}>
            <View style={styles.destaqueTopo}>
              <Ionicons name="stats-chart" size={18} color={theme.primaryText} />
              <ThemedText type="smallBold" themeColor="primaryText">
                Painel financeiro
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="primaryText" style={styles.destaqueNota}>
              Receita, ticket médio, mais vendidos e o que está por receber
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.primaryText} />
        </Pressable>

        <View style={styles.stats}>
          <StatCard
            icon="receipt-outline"
            valor={resumo?.quantidade ?? 0}
            label="Pedidos no mês"
            acao={{ label: 'Pedidos', onPress: () => router.push(ROTAS.adminPedidos) }}
          />
          <StatCard
            icon="cube-outline"
            valor={totalProdutos}
            label="Produtos"
            nota={inativos ? `${inativos} inativo${inativos > 1 ? 's' : ''}` : undefined}
            acao={{ label: 'Novo produto', onPress: () => router.push('/admin/produtos/novo') }}
          />
        </View>
      </View>

      {/* "Pedidos" e "Novo produto" mudaram pra dentro dos cartões dos números
          a que pertencem. Aqui ficam os destinos que não têm número próprio —
          e "Produtos", que é por onde se edita o que já existe. */}
      <View style={styles.atalhos}>
        <View style={styles.atalho}>
          <Button title="Produtos" variant="ghost" onPress={() => router.push(ROTAS.adminProdutos)} />
        </View>
        <View style={styles.atalho}>
          <Button title="Carrossel" variant="ghost" onPress={() => router.push(ROTAS.adminCarrossel)} />
        </View>
      </View>

      <View style={styles.grupo}>
        <SectionTitle
          titulo="Pedidos mais recentes"
          acao={{ label: 'Ver todos', onPress: () => router.push(ROTAS.adminPedidos) }}
        />

        {recentes.length ? (
          <View style={[styles.lista, { backgroundColor: theme.backgroundElement }]}>
            {recentes.map((pedido, i) => {
              // Capa = foto do primeiro item que tiver imagem.
              const capa = pedido.itens.find((x) => x.produto?.imagemUrl)?.produto?.imagemUrl;

              return (
                <Fragment key={pedido.id}>
                  {i > 0 ? <View style={[styles.divisor, { backgroundColor: theme.border }]} /> : null}
                  <Pressable
                    onPress={() => router.push(ROTAS.adminPedido(pedido.id))}
                    style={({ pressed }) => [styles.linha, { opacity: pressed ? 0.6 : 1 }]}>
                    {capa ? (
                      <Image source={{ uri: capa }} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, { backgroundColor: theme.secondary }]} />
                    )}
                    {/* Valor e etiqueta na primeira linha, nome do produto na
                        segunda: juntos numa linha só, o nome era cortado no
                        celular pelo espaço que a etiqueta e a seta ocupam. */}
                    <View style={styles.linhaTexto}>
                      <View style={styles.linhaTopo}>
                        <ThemedText type="smallBold">{moeda(pedido.total)}</ThemedText>
                        <TagProducao status={pedido.statusProducao} />
                      </View>
                      <ThemedText type="small" numberOfLines={1}>
                        {pedido.itens[0]?.produto?.nome ?? 'Produto removido'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {pedido.usuario.nome} · {dataCurta(pedido.createdAt)}
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  </Pressable>
                </Fragment>
              );
            })}
          </View>
        ) : (
          <View style={[styles.vazio, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="receipt-outline" size={28} color={theme.textSecondary} />
            <ThemedText type="smallBold">Nenhum pedido pago ainda</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.vazioTexto}>
              Assim que um cliente finalizar o pagamento, o pedido aparece aqui.
            </ThemedText>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grupo: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionAcao: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  sectionTitulo: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  destaque: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  destaqueTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  destaqueTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  destaqueNota: {
    opacity: 0.9,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.half,
  },
  statValor: {
    fontSize: 24,
    lineHeight: 30,
  },
  statNota: {
    fontSize: 12,
  },
  linhaTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  atalhos: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  atalho: {
    flex: 1,
  },
  statAcao: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: 1,
    // Colado no rodapé do cartão: um dos dois tem a linha de "inativos" e sem
    // isto os botões ficavam em alturas diferentes, lado a lado.
    marginTop: 'auto',
    paddingTop: Spacing.two,
  },
  lista: {
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  divisor: {
    height: 1,
    marginLeft: 48 + Spacing.three * 2,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.small,
  },
  linhaTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  vazio: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radius.medium,
  },
  vazioTexto: {
    textAlign: 'center',
  },
});
