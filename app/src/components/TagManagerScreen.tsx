import type { Estilo, Formato } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './Button';
import { Screen } from './Screen';
import { TextField } from './TextField';
import { ThemedText } from './themed-text';

type TagItem = Formato | Estilo;

interface TagHooksSet {
  useList: () => { data?: { items: TagItem[] }; isLoading: boolean };
  useCreate: () => { mutateAsync: (nome: string) => Promise<unknown>; isPending: boolean };
  useUpdate: () => {
    mutateAsync: (args: { id: string; nome: string }) => Promise<unknown>;
    isPending: boolean;
  };
  useRemove: () => { mutateAsync: (id: string) => Promise<unknown>; isPending: boolean };
}

export function TagManagerScreen({
  title,
  singular,
  hooks,
}: {
  title: string;
  singular: string;
  hooks: TagHooksSet;
}) {
  const { data, isLoading } = hooks.useList();
  const createMutation = hooks.useCreate();
  const updateMutation = hooks.useUpdate();
  const removeMutation = hooks.useRemove();

  const [novoNome, setNovoNome] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [error, setError] = useState<string>();
  const theme = useTheme();

  async function handleCreate() {
    if (!novoNome.trim()) return;
    setError(undefined);
    try {
      await createMutation.mutateAsync(novoNome.trim());
      setNovoNome('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar');
    }
  }

  async function handleUpdate(id: string) {
    if (!editNome.trim()) return;
    setError(undefined);
    try {
      await updateMutation.mutateAsync({ id, nome: editNome.trim() });
      setEditId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  async function handleRemove(id: string) {
    setError(undefined);
    try {
      await removeMutation.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover');
    }
  }

  return (
    <Screen scroll={false}>
      <ThemedText type="title">{title}</ThemedText>

      <View style={styles.addRow}>
        <View style={styles.addField}>
          <TextField label={`Novo ${singular}`} value={novoNome} onChangeText={setNovoNome} />
        </View>
        <Button title="Adicionar" onPress={handleCreate} loading={createMutation.isPending} />
      </View>

      {error ? (
        <ThemedText themeColor="danger" type="small">
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
              {editId === item.id ? (
                <>
                  <View style={styles.addField}>
                    <TextField label="Nome" value={editNome} onChangeText={setEditNome} />
                  </View>
                  <Pressable onPress={() => handleUpdate(item.id)} style={styles.iconButton}>
                    <Ionicons name="checkmark" size={20} color={theme.success} />
                  </Pressable>
                  <Pressable onPress={() => setEditId(null)} style={styles.iconButton}>
                    <Ionicons name="close" size={20} color={theme.textSecondary} />
                  </Pressable>
                </>
              ) : (
                <>
                  <ThemedText style={styles.rowLabel}>{item.nome}</ThemedText>
                  <Pressable
                    onPress={() => {
                      setEditId(item.id);
                      setEditNome(item.nome);
                    }}
                    style={styles.iconButton}>
                    <Ionicons name="pencil" size={18} color={theme.text} />
                  </Pressable>
                  <Pressable onPress={() => handleRemove(item.id)} style={styles.iconButton}>
                    <Ionicons name="trash" size={18} color={theme.danger} />
                  </Pressable>
                </>
              )}
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  addField: {
    flex: 1,
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
  },
  iconButton: {
    padding: Spacing.one,
  },
});
