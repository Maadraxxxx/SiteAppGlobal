import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Spacing } from '@/constants/theme';
import { Button } from './Button';
import { Chip } from './Chip';
import { TextField } from './TextField';
import { ThemedText } from './themed-text';

interface TagOption {
  id: string;
  nome: string;
}

interface TagSelectorProps {
  label: string;
  options: TagOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCreate: (nome: string) => Promise<{ item: TagOption }>;
  creating?: boolean;
}

export function TagSelector({ label, options, selectedId, onSelect, onCreate, creating }: TagSelectorProps) {
  const [adding, setAdding] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [error, setError] = useState<string>();

  async function handleCreate() {
    if (!novoNome.trim()) return;
    setError(undefined);
    try {
      const { item } = await onCreate(novoNome.trim());
      onSelect(item.id);
      setNovoNome('');
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar');
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {options.map((option) => (
            <Chip
              key={option.id}
              label={option.nome}
              selected={selectedId === option.id}
              onPress={() => onSelect(option.id)}
            />
          ))}
          <Chip label="+ Novo" selected={adding} onPress={() => setAdding((prev) => !prev)} />
        </View>
      </ScrollView>

      {adding ? (
        <View style={styles.addRow}>
          <View style={styles.addField}>
            <TextField label={`Novo ${label.toLowerCase()}`} value={novoNome} onChangeText={setNovoNome} />
          </View>
          <Button title="Criar" onPress={handleCreate} loading={creating} />
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
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  addField: {
    flex: 1,
  },
});
