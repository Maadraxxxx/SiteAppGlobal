import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { FormSection } from '@/components/FormSection';
import { ImageUploadField } from '@/components/ImageUploadField';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAdminBanners, useCreateBanner, useRemoveBanner } from '@/hooks/useBanners';
import { useTheme } from '@/hooks/use-theme';

export default function AdminBannersScreen() {
  const { data, isLoading } = useAdminBanners();
  const createMutation = useCreateBanner();
  const removeMutation = useRemoveBanner();
  const theme = useTheme();

  async function handleAdd(url: string | undefined) {
    if (!url) return;
    await createMutation.mutateAsync(url);
  }

  return (
    <Screen scroll={false}>
      <ThemedText type="title">Carrossel da Home</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        As fotos aqui aparecem em rotação automática na tela inicial do app.
      </ThemedText>

      <FormSection title="Adicionar foto">
        <ImageUploadField aspect={[1, 1]} boxWidth={200} onChange={handleAdd} />
      </FormSection>

      {isLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          style={styles.listFlex}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
              <Image source={{ uri: item.imagemUrl }} style={styles.thumb} contentFit="cover" />
              <Pressable onPress={() => removeMutation.mutate(item.id)} hitSlop={8} style={styles.removeButton}>
                <Ionicons name="trash" size={18} color={theme.danger} />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma foto adicionada ainda.
            </ThemedText>
          }
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: Radius.medium,
    gap: Spacing.three,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: Radius.small,
  },
  removeButton: {
    padding: Spacing.two,
  },
});
