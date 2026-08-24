import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
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
  const [error, setError] = useState<string>();
  const [removendoId, setRemovendoId] = useState<string>();

  async function handleAdd(url: string | undefined) {
    if (!url) return;
    setError(undefined);
    try {
      await createMutation.mutateAsync(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar a foto');
    }
  }

  // mutate() engole a falha em silencio — com mutateAsync da pra avisar
  // quando a exclusao nao foi, em vez da foto so continuar ali sem explicacao.
  async function handleRemove(id: string) {
    setError(undefined);
    setRemovendoId(id);
    try {
      await removeMutation.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir a foto');
    } finally {
      setRemovendoId(undefined);
    }
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

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

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
              <Pressable
                onPress={() => handleRemove(item.id)}
                disabled={!!removendoId}
                hitSlop={8}
                style={styles.removeButton}>
                {removendoId === item.id ? (
                  <ActivityIndicator size="small" color={theme.danger} />
                ) : (
                  <Ionicons name="trash" size={18} color={theme.danger} />
                )}
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
