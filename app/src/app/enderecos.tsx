import type { Endereco } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { EnderecoForm } from '@/components/EnderecoForm';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  useAtualizarEndereco,
  useCriarEndereco,
  useEnderecos,
  useRemoverEndereco,
} from '@/hooks/useEnderecos';
import { useTheme } from '@/hooks/use-theme';

export function linhaEndereco(e: Endereco) {
  const complemento = e.complemento ? `, ${e.complemento}` : '';
  return `${e.logradouro}, ${e.numero}${complemento} — ${e.bairro}, ${e.cidade}/${e.uf}`;
}

export default function EnderecosScreen() {
  const { data, isLoading } = useEnderecos();
  const criar = useCriarEndereco();
  const atualizar = useAtualizarEndereco();
  const remover = useRemoverEndereco();
  const theme = useTheme();

  const [editando, setEditando] = useState<Endereco | 'novo' | null>(null);
  const [error, setError] = useState<string>();

  const enderecos = data?.items ?? [];

  async function handleSalvar(input: Parameters<typeof criar.mutateAsync>[0]) {
    setError(undefined);
    try {
      if (editando && editando !== 'novo') {
        await atualizar.mutateAsync({ id: editando.id, input });
      } else {
        await criar.mutateAsync(input);
      }
      setEditando(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar');
    }
  }

  async function handleRemover(id: string) {
    setError(undefined);
    try {
      await remover.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel excluir');
    }
  }

  if (isLoading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (editando) {
    return (
      <Screen maxWidth={640} style={styles.screen}>
        <ThemedText type="smallBold">
          {editando === 'novo' ? 'Novo endereço' : 'Editar endereço'}
        </ThemedText>
        <EnderecoForm
          inicial={editando === 'novo' ? undefined : editando}
          salvando={criar.isPending || atualizar.isPending}
          onSalvar={handleSalvar}
          onCancelar={() => setEditando(null)}
        />
        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen maxWidth={640} style={styles.screen}>
      {enderecos.length ? (
        enderecos.map((endereco) => (
          <View key={endereco.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.cardTopo}>
              <ThemedText type="smallBold">{endereco.apelido ?? 'Endereço'}</ThemedText>
              {endereco.principal ? (
                <View style={[styles.selo, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small">Principal</ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {linhaEndereco(endereco)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              CEP {endereco.cep}
            </ThemedText>

            <View style={styles.acoes}>
              <Pressable onPress={() => setEditando(endereco)} hitSlop={8} style={styles.acao}>
                <Ionicons name="create-outline" size={16} color={theme.primary} />
                <ThemedText type="small" themeColor="primary">
                  Editar
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => handleRemover(endereco.id)} hitSlop={8} style={styles.acao}>
                <Ionicons name="trash-outline" size={16} color={theme.danger} />
                <ThemedText type="small" themeColor="danger">
                  Excluir
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.vazio}>
          <Ionicons name="location-outline" size={40} color={theme.textSecondary} />
          <ThemedText type="smallBold">Nenhum endereço salvo</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
            Cadastre um endereço para calcular o frete na hora da compra.
          </ThemedText>
        </View>
      )}

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button title="Adicionar endereço" onPress={() => setEditando('novo')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralizado: {
    textAlign: 'center',
  },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.half,
  },
  cardTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  selo: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  acoes: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginTop: Spacing.two,
  },
  acao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  vazio: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
});
