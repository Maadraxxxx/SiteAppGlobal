import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Fragment } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAdminBanners } from '@/hooks/useBanners';
import { useCategorias } from '@/hooks/useCatalogo';
import { useAdminProdutos } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

const RECENTES = 4;

// A rota existe (admin/banners/index.tsx) e navega normal, mas o router.d.ts
// que o Expo gera esta desatualizado nesta sessao do dev server: ele ainda
// lista as telas de categoria que ja foram removidas e nao lista /admin/banners.
// Reiniciando o `npm run dev` o arquivo e regerado e este cast pode sair.
const ROTA_CARROSSEL = '/admin/banners' as Parameters<typeof router.push>[0];

function moeda(valor: string | number) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

function SectionTitle({ titulo, acao }: { titulo: string; acao?: { label: string; onPress: () => void } }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitulo}>
        {titulo}
      </ThemedText>
      {acao ? (
        <Pressable onPress={acao.onPress} hitSlop={8}>
          <ThemedText type="smallBold" themeColor="primary">
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
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  valor: number;
  label: string;
  nota?: string;
  /** Sem onPress o cartao e so informativo — e o caso de categoria, que nao
   * tem tela propria (e criada dentro do formulario do produto). */
  onPress?: () => void;
}) {
  const theme = useTheme();

  const conteudo = (
    <>
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
    </>
  );

  if (!onPress) {
    return <View style={[styles.stat, { backgroundColor: theme.backgroundElement }]}>{conteudo}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.stat,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
      ]}>
      {conteudo}
    </Pressable>
  );
}

export default function AdminDashboard() {
  const theme = useTheme();
  const produtos = useAdminProdutos();
  const banners = useAdminBanners();
  const categorias = useCategorias();

  const itens = produtos.data?.items ?? [];
  const totalProdutos = produtos.data?.total ?? 0;
  const inativos = itens.filter((p) => !p.ativo).length;
  const recentes = itens.slice(0, RECENTES);
  const carregando = produtos.isLoading || banners.isLoading || categorias.isLoading;

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
        <SectionTitle titulo="Resumo" />
        <View style={styles.stats}>
          <StatCard
            icon="cube-outline"
            valor={totalProdutos}
            label="Produtos"
            nota={inativos ? `${inativos} inativo${inativos > 1 ? 's' : ''}` : undefined}
            onPress={() => router.push('/admin/produtos')}
          />
          <StatCard
            icon="pricetags-outline"
            valor={categorias.data?.items.length ?? 0}
            label="Categorias"
          />
          <StatCard
            icon="images-outline"
            valor={banners.data?.items.length ?? 0}
            label="Carrossel"
            onPress={() => router.push(ROTA_CARROSSEL)}
          />
        </View>
      </View>

      <View style={styles.acoes}>
        <View style={styles.acaoBotao}>
          <Button title="Novo produto" onPress={() => router.push('/admin/produtos/novo')} />
        </View>
        <View style={styles.acaoBotao}>
          <Button title="Carrossel" variant="ghost" onPress={() => router.push(ROTA_CARROSSEL)} />
        </View>
      </View>

      <View style={styles.grupo}>
        <SectionTitle
          titulo="Últimos produtos"
          acao={totalProdutos ? { label: 'Ver todos', onPress: () => router.push('/admin/produtos') } : undefined}
        />

        {recentes.length ? (
          <View style={[styles.lista, { backgroundColor: theme.backgroundElement }]}>
            {recentes.map((produto, i) => (
              <Fragment key={produto.id}>
                {i > 0 ? <View style={[styles.divisor, { backgroundColor: theme.border }]} /> : null}
                <Pressable
                  onPress={() => router.push(`/admin/produtos/${produto.id}`)}
                  style={({ pressed }) => [styles.linha, { opacity: pressed ? 0.6 : 1 }]}>
                  {produto.imagemUrl ? (
                    <Image source={{ uri: produto.imagemUrl }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={[styles.thumb, { backgroundColor: theme.secondary }]} />
                  )}
                  <View style={styles.linhaTexto}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {produto.nome}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {moeda(produto.preco)}
                    </ThemedText>
                  </View>
                  {!produto.ativo ? (
                    <View style={[styles.selo, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText type="small" themeColor="textSecondary">
                        Inativo
                      </ThemedText>
                    </View>
                  ) : null}
                  <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                </Pressable>
              </Fragment>
            ))}
          </View>
        ) : (
          <View style={[styles.vazio, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="cube-outline" size={28} color={theme.textSecondary} />
            <ThemedText type="smallBold">Nenhum produto ainda</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.vazioTexto}>
              Cadastre o primeiro produto pra ele aparecer no catálogo.
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
  },
  sectionTitulo: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  acoes: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  acaoBotao: {
    flex: 1,
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
  selo: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
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
