import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAdminProdutos, useDesativarProduto, useReativarProduto } from '@/hooks/useProdutos';
import { useTheme } from '@/hooks/use-theme';

export default function AdminProdutosScreen() {
  const { data, isLoading } = useAdminProdutos();
  const desativarMutation = useDesativarProduto();
  const reativarMutation = useReativarProduto();
  const theme = useTheme();

  return (
    <Screen scroll={false}>
      {/* A barra de navegacao ja diz "Produtos", entao aqui fica so a acao. */}
      <Button title="Novo produto" onPress={() => router.push('/admin/produtos/novo')} />

      {isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          style={styles.listFlex}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary" style={styles.vazio}>
              Nenhum produto cadastrado ainda.
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
  listFlex: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  loading: {
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
