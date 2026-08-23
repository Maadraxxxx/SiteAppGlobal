import { Platform } from 'react-native';
import { tokenStorage } from '@/lib/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export async function uploadImagem(
  uri: string,
  filename: string,
  mimeType: string,
): Promise<string> {
  const token = await tokenStorage.get();
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const fileResponse = await fetch(uri);
    const blob = await fileResponse.blob();
    formData.append('file', blob, filename);
  } else {
    formData.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);
  }

  const response = await fetch(`${API_URL}/admin/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Falha ao enviar imagem');
  }

  return data.url as string;
}
