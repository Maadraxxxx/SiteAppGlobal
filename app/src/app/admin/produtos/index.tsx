import { Ionicons } from '@expo/vector-icons';
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
      <View style={styles.header}>
        <ThemedText type="title">Produtos</ThemedText>
        <Button title="Novo" onPress={() => router.push('/admin/produtos/novo')} />
      </View>

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          style={styles.listFlex}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/admin/produtos/${item.id}`)}
              style={[styles.row, { backgroundColor: theme.backgroundElement, opacity: item.ativo ? 1 : 0.5 }]}>
              <View style={styles.rowLabel}>
                <ThemedText type="smallBold">{item.nome}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  R$ {Number(item.preco).toFixed(2).replace('.', ',')} {item.ativo ? '' : '· inativo'}
                </ThemedText>
              </View>
              <Pressable
                onPress={() =>
                  item.ativo ? desativarMutation.mutate(item.id) : reativarMutation.mutate(item.id)
                }
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listFlex: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.two,
  },
  rowLabel: {
    flex: 1,
    gap: Spacing.half,
  },
  iconButton: {
    padding: Spacing.one,
  },
});
