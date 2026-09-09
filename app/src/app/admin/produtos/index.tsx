import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { Screen, useMostrarBarraDeRolagem } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useCategorias } from '@/hooks/useCatalogo';
import { useAdminProdutos, useDesativarProduto, useReativarProduto } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

type Situacao = 'todos' | 'ativos' | 'inativos';
const SITUACOES: { valor: Situacao; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'ativos', rotulo: 'Ativos' },
  { valor: 'inativos', rotulo: 'Inativos' },
];

/**
 * O máximo que o servidor entrega de uma vez. Pedido de propósito, e não o
 * padrão de 20: no painel a lista some inteira quando é cortada, e o admin não
 * teria como saber que faltou produto.
 */
const POR_PAGINA = 50;

function Pilula({
  rotulo,
  ativa,
  onPress,
}: {
  rotulo: string;
  ativa: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pilula,
        {
          backgroundColor: ativa ? theme.primary : theme.backgroundElement,
          borderColor: ativa ? theme.primary : theme.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <ThemedText type="small" themeColor={ativa ? 'primaryText' : 'textSecondary'}>
        {rotulo}
      </ThemedText>
    </Pressable>
  );
}

export default function AdminProdutosScreen() {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('');
  const [situacao, setSituacao] = useState<Situacao>('todos');
  const [categoriaSlug, setCategoriaSlug] = useState<string>();

  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();

  useEffect(() => {
    const id = setTimeout(() => setFiltro(busca.trim()), 300);
    return () => clearTimeout(id);
  }, [busca]);

  const { data, isLoading } = useAdminProdutos({
    search: filtro || undefined,
    categoria: categoriaSlug,
    pageSize: POR_PAGINA,
    // Só catálogo. As peças de IA têm aba própria; misturar as duas aqui era
    // o que fazia parecer que dava pra converter um produto no outro.
    paraIA: false,
  });
  const categorias = useCategorias();
  const desativarMutation = useDesativarProduto();
  const reativarMutation = useReativarProduto();

  const todos = useMemo(() => data?.items ?? [], [data]);

  // Ativo/inativo é filtrado aqui, e não no servidor: a rota do admin traz os
  // dois de propósito, e separar na tela responde na hora, sem nova consulta.
  const produtos = useMemo(() => {
    if (situacao === 'ativos') return todos.filter((p) => p.ativo);
    if (situacao === 'inativos') return todos.filter((p) => !p.ativo);
    return todos;
  }, [todos, situacao]);

  const total = data?.total ?? 0;
  const cortou = total > todos.length;
  const filtrando = !!filtro || !!categoriaSlug || situacao !== 'todos';

  return (
    <Screen scroll={false} style={styles.tela}>
      <Button title="Novo produto" onPress={() => router.push('/admin/produtos/novo')} />

      <View style={[styles.busca, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.textSecondary} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar produto pelo nome"
          placeholderTextColor={theme.textSecondary}
          style={[styles.buscaInput, { color: theme.text, fontFamily: Fonts.sans }]}
        />
        {busca ? (
          <Pressable onPress={() => setBusca('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filtros}>
        {SITUACOES.map((s) => (
          <Pilula
            key={s.valor}
            rotulo={s.rotulo}
            ativa={situacao === s.valor}
            onPress={() => setSituacao(s.valor)}
          />
        ))}
      </View>

      {categorias.data?.items.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasBleed}>
          <View style={styles.filtros}>
            <Pilula
              rotulo="Toda categoria"
              ativa={!categoriaSlug}
              onPress={() => setCategoriaSlug(undefined)}
            />
            {categorias.data.items.map((c) => (
              <Pilula
                key={c.id}
                rotulo={c.nome}
                // Tocar de novo na escolhida limpa o filtro — é o gesto que a
                // pessoa tenta antes de procurar o "todas".
                ativa={categoriaSlug === c.slug}
                onPress={() => setCategoriaSlug(categoriaSlug === c.slug ? undefined : c.slug)}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}

      <View style={styles.contagem}>
        <ThemedText type="small" themeColor="textSecondary">
          {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
          {filtrando ? ` de ${total}` : ''}
        </ThemedText>

        {filtrando ? (
          <Pressable
            onPress={() => {
              setBusca('');
              setSituacao('todos');
              setCategoriaSlug(undefined);
            }}
            hitSlop={8}>
            <ThemedText type="smallBold" themeColor="primary">
              Limpar
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {/* Avisa em vez de cortar em silêncio: sem isto o admin acharia que os
          produtos que faltam foram apagados. */}
      {cortou ? (
        <ThemedText type="small" themeColor="textSecondary">
          Mostrando os {todos.length} mais recentes de {total}. Use a busca para achar os outros.
        </ThemedText>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={mostrarBarra}
          data={produtos}
          keyExtractor={(item) => item.id}
          style={styles.listFlex}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.vazio}>
              {filtrando
                ? 'Nenhum produto com esses filtros.'
                : 'Nenhum produto cadastrado ainda.'}
            </ThemedText>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/admin/produtos/${item.id}`)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.6 : item.ativo ? 1 : 0.6 },
              ]}>
              {item.imagemUrl ? (
                <Image source={{ uri: item.imagemUrl }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, { backgroundColor: theme.secondary }]} />
              )}
              <View style={styles.rowLabel}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.nome}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                  {item.ativo ? '' : ' · inativo'}
                </ThemedText>
              </View>
              <Pressable
                onPress={() =>
                  item.ativo ? desativarMutation.mutate(item.id) : reativarMutation.mutate(item.id)
                }
                hitSlop={8}
                style={styles.iconButton}>
                <Ionicons
                  name={item.ativo ? 'eye-off' : 'eye'}
                  size={18}
                  color={item.ativo ? theme.danger : theme.success}
                />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: {
    gap: Spacing.two,
  },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  buscaInput: {
    flex: 1,
    fontSize: 14,
    outlineWidth: 0,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoriasBleed: {
    flexGrow: 0,
  },
  pilula: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  contagem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  carregando: {
    marginTop: Spacing.four,
  },
  vazio: {
    marginTop: Spacing.four,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.three,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Radius.small,
  },
  rowLabel: {
    flex: 1,
    gap: Spacing.half,
  },
  iconButton: {
    padding: Spacing.one,
  },
});
