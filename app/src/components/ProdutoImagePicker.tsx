import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { uploadProdutoImagem } from '@/api/uploads';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

interface Props {
  value?: string;
  onChange: (url: string | undefined) => void;
}

export function ProdutoImagePicker({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const theme = useTheme();

  async function handlePick() {
    setError(undefined);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão de acesso às fotos negada');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploading(true);
    try {
      const filename = asset.fileName ?? `produto-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const url = await uploadProdutoImagem(asset.uri, filename, mimeType);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePick}
        disabled={uploading}
        style={[styles.box, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {uploading ? (
          <ActivityIndicator color={theme.primary} />
        ) : value ? (
          <Image source={{ uri: value }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera" size={28} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              Escolher imagem
            </ThemedText>
          </View>
        )}
      </Pressable>

      {value && !uploading ? (
        <View style={styles.actionsWrapper}>
          <Pressable onPress={handlePick} style={styles.actionRow}>
            <Ionicons name="repeat" size={16} color={theme.primary} />
            <ThemedText type="small" themeColor="primary">
              Trocar
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => onChange(undefined)} style={styles.actionRow}>
            <Ionicons name="trash" size={16} color={theme.danger} />
            <ThemedText type="small" themeColor="danger">
              Remover
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  box: {
    width: 160,
    height: 160,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionsWrapper: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
});
