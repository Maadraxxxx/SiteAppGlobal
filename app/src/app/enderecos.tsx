import type { Endereco } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
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

/** 17606035 vira 17606-035: e como o CEP e escrito em qualquer lugar. */
function formatarCep(cep: string) {
  const digitos = cep.replace(/\D/g, '');
  return digitos.length === 8 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : cep;
}

function Acao({
  icone,
  texto,
  cor,
  onPress,
  ocupado,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  texto: string;
  cor: string;
  onPress: () => void;
  ocupado?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={ocupado}
      hitSlop={8}
      style={({ pressed }) => [styles.acao, { opacity: pressed || ocupado ? 0.6 : 1 }]}>
      {ocupado ? <ActivityIndicator size="small" color={cor} /> : <Ionicons name={icone} size={16} color={cor} />}
      <ThemedText type="small" style={{ color: cor }}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

export default function EnderecosScreen() {
  const { data, isLoading } = useEnderecos();
  const criar = useCriarEndereco();
  const atualizar = useAtualizarEndereco();
  const remover = useRemoverEndereco();
  const theme = useTheme();

  const [editando, setEditando] = useState<Endereco | 'novo' | null>(null);
  const [error, setError] = useState<string>();
  // Excluir endereco nao tem volta, e o botao fica a um toque do "Editar" —
  // por isso a confirmacao acontece na propria linha, sem tirar o cliente da
  // tela.
  const [confirmando, setConfirmando] = useState<string>();
  const [ocupadoId, setOcupadoId] = useState<string>();

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
    setOcupadoId(id);
    try {
      await remover.mutateAsync(id);
      setConfirmando(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel excluir');
    } finally {
      setOcupadoId(undefined);
    }
  }

  /** O servidor desmarca os outros sozinho — so um fica principal. */
  async function handleTornarPrincipal(endereco: Endereco) {
    setError(undefined);
    setOcupadoId(endereco.id);
    try {
      const { id, principal, ...resto } = endereco;
      await atualizar.mutateAsync({ id, input: { ...resto, principal: true } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel definir como principal');
    } finally {
      setOcupadoId(undefined);
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
        <>
          {/* Explica o selo "Principal", que antes aparecia sem dizer a que veio. */}
          <ThemedText type="small" themeColor="textSecondary">
            O endereço principal é o que já vem escolhido na hora da compra e
            define o cálculo do frete.
          </ThemedText>

          {enderecos.map((endereco) => {
            const ocupado = ocupadoId === endereco.id;
            const confirmandoEste = confirmando === endereco.id;

            return (
              <View
                key={endereco.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.backgroundElement,
                    // O principal ganha contorno da marca: da pra achar de
                    // relance numa lista de varios.
                    borderColor: endereco.principal ? theme.primary : 'transparent',
                  },
                ]}>
                <View style={styles.cardTopo}>
                  <View
                    style={[
                      styles.icone,
                      { backgroundColor: endereco.principal ? theme.primary : theme.backgroundSelected },
                    ]}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={endereco.principal ? theme.primaryText : theme.textSecondary}
                    />
                  </View>

                  <View style={styles.cardTexto}>
                    <View style={styles.tituloLinha}>
                      <ThemedText type="smallBold" numberOfLines={1} style={styles.apelido}>
                        {endereco.apelido ?? 'Endereço'}
                      </ThemedText>
                      {endereco.principal ? (
                        <View style={[styles.selo, { backgroundColor: theme.primary }]}>
                          <ThemedText type="small" themeColor="primaryText">
                            Principal
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>

                    <ThemedText type="small">
                      {endereco.logradouro}, {endereco.numero}
                      {endereco.complemento ? `, ${endereco.complemento}` : ''}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {endereco.bairro} · {endereco.cidade}/{endereco.uf}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      CEP {formatarCep(endereco.cep)}
                    </ThemedText>

                    {/* Sem CPF/CNPJ a transportadora recusa emitir a etiqueta, e
                        o cliente so descobria isso depois de pagar. */}
                    {endereco.documento ? null : (
                      <View style={styles.aviso}>
                        <Ionicons name="alert-circle-outline" size={14} color={theme.danger} />
                        <ThemedText type="small" style={[styles.avisoTexto, { color: theme.danger }]}>
                          Falta o CPF/CNPJ — a transportadora exige pra emitir a etiqueta.
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.rodape, { borderColor: theme.border }]}>
                  {confirmandoEste ? (
                    <>
                      <ThemedText type="small" style={styles.pergunta}>
                        Excluir este endereço?
                      </ThemedText>
                      <Acao
                        icone="close"
                        texto="Não"
                        cor={theme.textSecondary}
                        onPress={() => setConfirmando(undefined)}
                      />
                      <Acao
                        icone="trash"
                        texto="Excluir"
                        cor={theme.danger}
                        ocupado={ocupado}
                        onPress={() => handleRemover(endereco.id)}
                      />
                    </>
                  ) : (
                    <>
                      <Acao
                        icone="create-outline"
                        texto="Editar"
                        cor={theme.primary}
                        onPress={() => setEditando(endereco)}
                      />
                      {/* Havia o selo de principal mas nenhum jeito de trocar
                          qual era — dava pra mudar só apagando e recriando. */}
                      {endereco.principal ? null : (
                        <Acao
                          icone="star-outline"
                          texto="Tornar principal"
                          cor={theme.primary}
                          ocupado={ocupado}
                          onPress={() => handleTornarPrincipal(endereco)}
                        />
                      )}
                      <Acao
                        icone="trash-outline"
                        texto="Excluir"
                        cor={theme.danger}
                        onPress={() => setConfirmando(endereco.id)}
                      />
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </>
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
        <View style={[styles.erro, { borderColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.erroTexto}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {/* Tracejado em vez da barra laranja cheia: adicionar e uma acao de apoio,
          e a barra solida gritava mais que a lista inteira. */}
      <Pressable
        onPress={() => setEditando('novo')}
        style={({ pressed }) => [
          styles.adicionar,
          { borderColor: theme.primary, opacity: pressed ? 0.6 : 1 },
        ]}>
        <Ionicons name="add" size={20} color={theme.primary} />
        <ThemedText type="smallBold" themeColor="primary">
          Adicionar endereço
        </ThemedText>
      </Pressable>
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
    borderWidth: 1,
    gap: Spacing.two,
  },
  cardTopo: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  icone: {
    width: 36,
    height: 36,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  tituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  apelido: {
    flexShrink: 1,
  },
  selo: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  avisoTexto: {
    flex: 1,
  },
  rodape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.four,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  pergunta: {
    flexShrink: 1,
  },
  acao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
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
  adicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  vazio: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
});
