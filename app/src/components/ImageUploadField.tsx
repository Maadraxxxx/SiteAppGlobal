import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { uploadImagem } from '@/api/uploads';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RecorteDeImagem } from './RecorteDeImagem';
import { ThemedText } from './themed-text';

interface Props {
  value?: string;
  onChange: (url: string | undefined) => void;
  /** proporção largura x altura do recorte — padrão quadrado (fotos de produto) */
  aspect?: [number, number];
  boxWidth?: number;
  boxHeight?: number;
}

export function ImageUploadField({ value, onChange, aspect = [1, 1], boxWidth = 160, boxHeight }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  // Imagem escolhida esperando o enquadramento, so na web.
  const [paraRecortar, setParaRecortar] = useState<string>();
  const theme = useTheme();
  const height = boxHeight ?? (boxWidth * aspect[1]) / aspect[0];

  async function handlePick() {
    setError(undefined);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão de acesso às fotos negada');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.9,
      // Na web esta opção não faz nada — quem recorta lá é a nossa tela. No app
      // nativo o editor do sistema é melhor que qualquer coisa que a gente faça.
      allowsEditing: Platform.OS !== 'web',
      aspect,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    if (Platform.OS === 'web') {
      setParaRecortar(asset.uri);
      return;
    }

    await enviar(asset.uri, asset.fileName ?? undefined, asset.mimeType ?? undefined);
  }

  async function enviar(uri: string, filename?: string, mimeType?: string) {
    setUploading(true);
    try {
      const url = await uploadImagem(
        uri,
        filename ?? `imagem-${Date.now()}.jpg`,
        mimeType ?? 'image/jpeg',
      );
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      {paraRecortar ? (
        <RecorteDeImagem
          uri={paraRecortar}
          aspect={aspect}
          onCancelar={() => setParaRecortar(undefined)}
          onConfirmar={(recortada) => {
            setParaRecortar(undefined);
            void enviar(recortada);
          }}
        />
      ) : null}

      <Pressable
        onPress={handlePick}
        disabled={uploading}
        style={[
          styles.box,
          { width: boxWidth, height, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
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
