import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useCategorias, useRemoveCategoria } from '@/hooks/useCatalogo';
import { useTheme } from '@/hooks/use-theme';

export default function AdminCategoriasScreen() {
  const { data, isLoading } = useCategorias();
  const removeMutation = useRemoveCategoria();
  const theme = useTheme();

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <ThemedText type="title">Categorias</ThemedText>
        <Button title="Nova" onPress={() => router.push('/admin/categorias/novo')} />
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
              onPress={() => router.push(`/admin/categorias/${item.id}`)}
              style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.rowLabel}>
                <ThemedText type="smallBold">{item.nome}</ThemedText>
                {item.descricao ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.descricao}
                  </ThemedText>
                ) : null}
              </View>
              <Pressable onPress={() => removeMutation.mutate(item.id)} style={styles.iconButton}>
                <Ionicons name="trash" size={18} color={theme.danger} />
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
