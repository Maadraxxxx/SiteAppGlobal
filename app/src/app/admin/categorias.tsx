import { Ionicons } from '@expo/vector-icons';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useCategorias, useDefinirCategoriaNaHome } from '@/hooks/useCatalogo';
import { useTheme } from '@/hooks/use-theme';

export default function AdminCategoriasScreen() {
  const { data, isLoading, isError } = useCategorias();
  const definir = useDefinirCategoriaNaHome();
  const theme = useTheme();
  const [error, setError] = useState<string>();
  const [mexendoEm, setMexendoEm] = useState<string>();

  const categorias = data?.items ?? [];
  const escolhidas = categorias.filter((c) => c.naHome).length;

  async function alternar(id: string, naHome: boolean) {
    setError(undefined);
    setMexendoEm(id);
    try {
      await definir.mutateAsync({ id, naHome });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para salvar');
    } finally {
      setMexendoEm(undefined);
    }
  }

  if (isLoading) {
    return (
      <Screen style={styles.centro}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen style={styles.centro}>
        <Ionicons name="cloud-offline-outline" size={40} color={theme.textSecondary} />
        <ThemedText type="smallBold">Não deu para carregar as categorias</ThemedText>
      </Screen>
    );
  }

  return (
    <Screen maxWidth={640} style={styles.tela}>
      <ThemedText type="small" themeColor="textSecondary">
        As categorias marcadas ganham uma vitrine própria na tela inicial, logo
        abaixo dos Destaques, com os produtos delas.
      </ThemedText>

      {categorias.length ? (
        <>
          <ThemedText type="small" themeColor="textSecondary" style={styles.contagem}>
            {escolhidas} de {categorias.length}{' '}
            {categorias.length === 1 ? 'categoria' : 'categorias'} na tela inicial
          </ThemedText>

          <View style={[styles.lista, { backgroundColor: theme.backgroundElement }]}>
            {categorias.map((categoria, i) => {
              const ocupado = mexendoEm === categoria.id;

              return (
                <Fragment key={categoria.id}>
                  {i > 0 ? <View style={[styles.divisor, { backgroundColor: theme.border }]} /> : null}
                  <Pressable
                    onPress={() => alternar(categoria.id, !categoria.naHome)}
                    disabled={!!mexendoEm}
                    style={({ pressed }) => [styles.linha, { opacity: pressed ? 0.6 : 1 }]}>
                    {/* Caixa de marcar em vez de interruptor: são várias numa
                        lista, e a marca lida de relance mostra quais estão na
                        Home sem ter que ler cada uma. */}
                    <View
                      style={[
                        styles.caixa,
                        {
                          backgroundColor: categoria.naHome ? theme.primary : 'transparent',
                          borderColor: categoria.naHome ? theme.primary : theme.border,
                        },
                      ]}>
                      {ocupado ? (
                        <ActivityIndicator size="small" color={categoria.naHome ? '#FFFFFF' : theme.primary} />
                      ) : categoria.naHome ? (
                        <Ionicons name="checkmark" size={16} color={theme.primaryText} />
                      ) : null}
                    </View>

                    <ThemedText type="smallBold" style={styles.nome} numberOfLines={1}>
                      {categoria.nome}
                    </ThemedText>
                  </Pressable>
                </Fragment>
              );
            })}
          </View>
        </>
      ) : (
        <View style={[styles.vazio, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="pricetags-outline" size={28} color={theme.textSecondary} />
          <ThemedText type="smallBold">Nenhuma categoria ainda</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
            As categorias são criadas dentro do formulário do produto.
          </ThemedText>
        </View>
      )}

      {error ? (
        <View style={[styles.erro, { borderColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.erroTexto}>
            {error}
          </ThemedText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: {
    gap: Spacing.three,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  centralizado: {
    textAlign: 'center',
  },
  contagem: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  lista: {
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nome: {
    flex: 1,
  },
  divisor: {
    height: 1,
  },
  erro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  erroTexto: {
    flex: 1,
  },
  vazio: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
  },
});
