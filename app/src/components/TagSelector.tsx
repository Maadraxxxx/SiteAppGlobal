import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  onSelect: (id: string | undefined) => void;
  onCreate: (nome: string) => Promise<{ item: TagOption }>;
  /** Sem isto a lista não ganha o botão de excluir. */
  onRemove?: (id: string) => Promise<unknown>;
  creating?: boolean;
  /** Concorda o "Novo/Nova" com o substantivo do label (categoria e feminino). */
  genero?: 'm' | 'f';
}

export function TagSelector({
  label,
  options,
  selectedId,
  onSelect,
  onCreate,
  onRemove,
  creating,
  genero = 'm',
}: TagSelectorProps) {
  const [adding, setAdding] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [error, setError] = useState<string>();
  // Excluir fica atrás de um modo próprio: as pastilhas são o controle de
  // escolha, e um "x" sempre visível vira exclusão por engano no meio do
  // cadastro.
  const [modoExcluir, setModoExcluir] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string>();
  const theme = useTheme();
  const novo = genero === 'f' ? 'Nova' : 'Novo';

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

  async function handleRemove(option: TagOption) {
    if (!onRemove) return;
    setError(undefined);
    setExcluindoId(option.id);
    try {
      await onRemove(option.id);
      // Some a que estava escolhida: deixar o id apontando pro que nao existe
      // mais faria o Salvar falhar sem explicacao.
      if (selectedId === option.id) onSelect(undefined);
    } catch (err) {
      // O servidor recusa com 409 quando a classificacao ainda esta em uso —
      // a mensagem dele ja diz por quantos produtos.
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setExcluindoId(undefined);
    }
  }

  const podeExcluir = !!onRemove && options.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>

        {podeExcluir ? (
          <Pressable
            onPress={() => {
              setModoExcluir((prev) => !prev);
              setError(undefined);
            }}
            hitSlop={8}>
            <ThemedText type="small" themeColor={modoExcluir ? 'primary' : 'textSecondary'}>
              {modoExcluir ? 'Concluir' : 'Excluir'}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {options.map((option) =>
            modoExcluir ? (
              <Pressable
                key={option.id}
                onPress={() => handleRemove(option)}
                disabled={!!excluindoId}
                style={[styles.chipExcluir, { borderColor: theme.danger }]}>
                {excluindoId === option.id ? (
                  <ActivityIndicator size="small" color={theme.danger} />
                ) : (
                  <Ionicons name="close-circle" size={14} color={theme.danger} />
                )}
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {option.nome}
                </ThemedText>
              </Pressable>
            ) : (
              <Chip
                key={option.id}
                label={option.nome}
                selected={selectedId === option.id}
                onPress={() => onSelect(option.id)}
              />
            ),
          )}

          {/* Adicionar sai de cena enquanto se exclui: as duas ações juntas na
              mesma linha confundem o que cada toque faz. */}
          {modoExcluir ? null : (
            <Chip label={`+ ${novo}`} selected={adding} onPress={() => setAdding((prev) => !prev)} />
          )}
        </View>
      </ScrollView>

      {modoExcluir ? (
        <ThemedText type="small" themeColor="textSecondary">
          Toque para excluir. Só sai o que não estiver em nenhum produto.
        </ThemedText>
      ) : null}

      {adding ? (
        <View style={styles.addRow}>
          <View style={styles.addField}>
            <TextField label={`${novo} ${label.toLowerCase()}`} value={novoNome} onChangeText={setNovoNome} />
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
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  chipExcluir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
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
