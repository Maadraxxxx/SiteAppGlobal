import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useCategoria, useCreateCategoria, useUpdateCategoria } from '@/hooks/useCatalogo';

export default function AdminCategoriaFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'novo';

  const { data } = useCategoria(isNew ? undefined : id);
  const createMutation = useCreateCategoria();
  const updateMutation = useUpdateCategoria();

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (data?.categoria) {
      setNome(data.categoria.nome);
      setDescricao(data.categoria.descricao ?? '');
    }
  }, [data]);

  async function handleSave() {
    if (!nome.trim()) {
      setError('Informe um nome');
      return;
    }
    setError(undefined);
    try {
      if (isNew) {
        await createMutation.mutateAsync({ nome: nome.trim(), descricao: descricao.trim() || undefined });
      } else {
        await updateMutation.mutateAsync({ id, nome: nome.trim(), descricao: descricao.trim() || undefined });
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Screen style={{ gap: Spacing.three }}>
      <ThemedText type="title">{isNew ? 'Nova categoria' : 'Editar categoria'}</ThemedText>
      <TextField label="Nome" value={nome} onChangeText={setNome} />
      <TextField label="Descrição (opcional)" value={descricao} onChangeText={setDescricao} multiline />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
      <Button title="Salvar" onPress={handleSave} loading={saving} />
    </Screen>
  );
}
