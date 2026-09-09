import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen, useMostrarBarraDeRolagem } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAdminProdutos, useDesativarProduto, useReativarProduto } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

/** O mesmo teto do painel de produtos: o servidor não entrega mais que isso. */
const POR_PAGINA = 50;

export default function AdminProdutosIAScreen() {
  // Só as peças de IA. É o que separa esta aba do painel de produtos — as duas
  // listas nunca mostram o mesmo item.
  const { data, isLoading } = useAdminProdutos({ paraIA: true, pageSize: POR_PAGINA });
  const desativar = useDesativarProduto();
  const reativar = useReativarProduto();
  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();

  const pecas = data?.items ?? [];

  return (
    <Screen scroll={false} style={styles.tela}>
      <View style={[styles.explicacao, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.icone, { backgroundColor: theme.primary }]}>
          <Ionicons name="sparkles" size={18} color={theme.primaryText} />
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.explicacaoTexto}>
          Peças sem estampa, usadas como base da personalização. Elas não aparecem no catálogo —
          só na aba "Personalizar com IA".
        </ThemedText>
      </View>

      <Button
        title="Nova peça de IA"
        onPress={() => router.push('/admin/produtos/novo?ia=1')}
      />

      <ThemedText type="small" themeColor="textSecondary">
        {pecas.length} {pecas.length === 1 ? 'peça' : 'peças'}
      </ThemedText>

      {isLoading ? (
        <ActivityIndicator style={styles.carregando} />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={mostrarBarra}
          data={pecas}
          keyExtractor={(item) => item.id}
          style={styles.listaFlex}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.vazio}>
              <Ionicons name="color-palette-outline" size={28} color={theme.textSecondary} />
              <ThemedText type="smallBold">Nenhuma peça cadastrada</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
                Cadastre a primeira e ela aparece na aba de IA para o cliente escolher.
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/admin/produtos/${item.id}`)}
              style={({ pressed }) => [
                styles.linha,
                {
                  backgroundColor: theme.backgroundElement,
                  opacity: pressed ? 0.6 : item.ativo ? 1 : 0.6,
                },
              ]}>
              {item.imagemUrl ? (
                <Image source={{ uri: item.imagemUrl }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, { backgroundColor: theme.secondary }]} />
              )}

              <View style={styles.linhaTexto}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.nome}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                  {item.ativo ? '' : ' · inativo'}
                </ThemedText>
              </View>

              <Pressable
                onPress={() => (item.ativo ? desativar.mutate(item.id) : reativar.mutate(item.id))}
                hitSlop={8}
                style={styles.botaoIcone}>
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
  tela: { gap: Spacing.two },
  explicacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  icone: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explicacaoTexto: { flex: 1 },
  listaFlex: { flex: 1 },
  lista: { gap: Spacing.two, paddingBottom: Spacing.four },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.three,
  },
  thumb: { width: 48, height: 48, borderRadius: Radius.small },
  linhaTexto: { flex: 1, gap: Spacing.half },
  botaoIcone: { padding: Spacing.one },
  carregando: { marginTop: Spacing.four },
  centralizado: { textAlign: 'center' },
  vazio: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six },
});
