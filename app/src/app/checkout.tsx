import type { Endereco, OpcaoFrete } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { freteApi } from '@/api/frete';
import { Button } from '@/components/Button';
import { EnderecoForm } from '@/components/EnderecoForm';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useCriarEndereco, useEnderecos } from '@/hooks/useEnderecos';
import { useCriarPedido } from '@/hooks/usePedidos';
import { useTheme } from '@/hooks/use-theme';
import { ROTAS } from '@/lib/rotas';

function moeda(valor: number) {
  const [inteiro, centavos] = (valor || 0).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

function resumoEndereco(e: Endereco) {
  const complemento = e.complemento ? `, ${e.complemento}` : '';
  return `${e.logradouro}, ${e.numero}${complemento} — ${e.bairro}, ${e.cidade}/${e.uf}`;
}

export default function CheckoutScreen() {
  const { items, totalPreco, clear } = useCart();
  const { usuario } = useAuth();
  const { data, isLoading } = useEnderecos();
  const criarEndereco = useCriarEndereco();
  const criarPedido = useCriarPedido();
  const theme = useTheme();

  const [enderecoId, setEnderecoId] = useState<string>();
  const [cadastrando, setCadastrando] = useState(false);
  const [opcoes, setOpcoes] = useState<OpcaoFrete[]>([]);
  const [frete, setFrete] = useState<OpcaoFrete>();
  const [cotando, setCotando] = useState(false);
  const [error, setError] = useState<string>();

  const enderecos = data?.items ?? [];
  const enderecoEscolhido = enderecos.find((e) => e.id === enderecoId);
  const itensParaApi = items.map((i) => ({
    produtoId: i.produto.id,
    quantidade: i.quantidade,
    geracaoId: i.geracao?.id,
  }));
  const total = totalPreco + (frete?.preco ?? 0);

  // Abre já com o endereço principal marcado, pra não exigir um clique à toa.
  useEffect(() => {
    if (!enderecoId && enderecos.length) {
      setEnderecoId((enderecos.find((e) => e.principal) ?? enderecos[0]).id);
    }
  }, [enderecos, enderecoId]);

  // Trocou de endereço: a cotação anterior não vale mais.
  useEffect(() => {
    setOpcoes([]);
    setFrete(undefined);
  }, [enderecoId]);

  async function handleCotar() {
    if (!enderecoEscolhido) return;
    setError(undefined);
    setCotando(true);
    try {
      const { opcoes: resultado } = await freteApi.cotar(enderecoEscolhido.cep, itensParaApi);
      setOpcoes(resultado);
      if (!resultado.length) setError('Nenhuma transportadora atende esse endereço');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel calcular o frete');
    } finally {
      setCotando(false);
    }
  }

  async function handleNovoEndereco(input: Parameters<typeof criarEndereco.mutateAsync>[0]) {
    setError(undefined);
    try {
      const { endereco } = await criarEndereco.mutateAsync(input);
      setEnderecoId(endereco.id);
      setCadastrando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar o endereço');
    }
  }

  async function handleConfirmar() {
    if (!enderecoId || !frete) return;
    setError(undefined);
    try {
      const { pedido } = await criarPedido.mutateAsync({
        itens: itensParaApi,
        frete: { enderecoId, servicoId: frete.id },
      });
      clear();
      router.replace(ROTAS.pagamento(pedido.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel criar o pedido');
    }
  }

  if (!usuario) {
    return (
      <Screen style={styles.centered}>
        <ThemedText type="smallBold">Entre para finalizar a compra</ThemedText>
        <View style={styles.acaoLarga}>
          <Button title="Entrar" onPress={() => router.replace('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  if (!items.length) {
    return (
      <Screen style={styles.centered}>
        <Ionicons name="cart-outline" size={40} color={theme.textSecondary} />
        <ThemedText type="smallBold">Seu carrinho está vazio</ThemedText>
        <View style={styles.acaoLarga}>
          <Button title="Ver catálogo" onPress={() => router.replace('/(tabs)/catalogo')} />
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator />
      </Screen>
    );
  }

  // Sem nenhum endereço salvo, ou pediu pra cadastrar outro: mostra só o formulário.
  if (cadastrando || !enderecos.length) {
    return (
      <Screen maxWidth={640} style={styles.screen}>
        <ThemedText type="smallBold">Para onde enviamos?</ThemedText>
        <EnderecoForm
          salvando={criarEndereco.isPending}
          onSalvar={handleNovoEndereco}
          onCancelar={enderecos.length ? () => setCadastrando(false) : undefined}
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
      {/* 1. Endereço */}
      <View style={styles.secao}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.secaoTitulo}>
          Endereço de entrega
        </ThemedText>

        {enderecos.map((endereco) => {
          const marcado = endereco.id === enderecoId;
          return (
            <Pressable
              key={endereco.id}
              onPress={() => setEnderecoId(endereco.id)}
              style={[
                styles.opcao,
                {
                  backgroundColor: marcado ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: marcado ? theme.primary : 'transparent',
                },
              ]}>
              <Ionicons
                name={marcado ? 'radio-button-on' : 'radio-button-off'}
                size={18}
                color={marcado ? theme.primary : theme.textSecondary}
              />
              <View style={styles.opcaoTexto}>
                <ThemedText type="smallBold">{endereco.apelido ?? 'Endereço'}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {resumoEndereco(endereco)}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}

        <Pressable onPress={() => setCadastrando(true)} hitSlop={8} style={styles.link}>
          <Ionicons name="add" size={16} color={theme.primary} />
          <ThemedText type="smallBold" themeColor="primary">
            Usar outro endereço
          </ThemedText>
        </Pressable>
      </View>

      {/* 2. Frete */}
      <View style={styles.secao}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.secaoTitulo}>
          Entrega
        </ThemedText>

        {!opcoes.length ? (
          <Button
            title="Ver opções de entrega"
            variant="ghost"
            onPress={handleCotar}
            loading={cotando}
            disabled={!enderecoEscolhido}
          />
        ) : (
          opcoes.map((opcao) => {
            const marcada = frete?.id === opcao.id;
            return (
              <Pressable
                key={opcao.id}
                onPress={() => setFrete(opcao)}
                style={[
                  styles.opcao,
                  {
                    backgroundColor: marcada ? theme.backgroundSelected : theme.backgroundElement,
                    borderColor: marcada ? theme.primary : 'transparent',
                  },
                ]}>
                <Ionicons
                  name={marcada ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={marcada ? theme.primary : theme.textSecondary}
                />
                <View style={styles.opcaoTexto}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {opcao.transportadora} {opcao.nome}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {opcao.prazoDias > 0
                      ? `${opcao.prazoDias} ${opcao.prazoDias === 1 ? 'dia útil' : 'dias úteis'}`
                      : 'Prazo a confirmar'}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" themeColor="primary">
                  {moeda(opcao.preco)}
                </ThemedText>
              </Pressable>
            );
          })
        )}
      </View>

      {/* 3. Resumo */}
      <View style={[styles.resumo, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.resumoLinha}>
          <ThemedText type="small" themeColor="textSecondary">
            Produtos ({items.length} {items.length === 1 ? 'item' : 'itens'})
          </ThemedText>
          <ThemedText type="small">{moeda(totalPreco)}</ThemedText>
        </View>

        <View style={styles.resumoLinha}>
          <ThemedText type="small" themeColor="textSecondary">
            Frete{frete ? ` (${frete.nome})` : ''}
          </ThemedText>
          <ThemedText type="small">{frete ? moeda(frete.preco) : '—'}</ThemedText>
        </View>

        <View style={[styles.resumoLinha, styles.totalLinha, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">Total</ThemedText>
          <ThemedText type="subtitle" themeColor="primary" style={styles.totalValor}>
            {moeda(total)}
          </ThemedText>
        </View>
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button
        title={frete ? 'Confirmar e pagar' : 'Escolha a entrega'}
        onPress={handleConfirmar}
        disabled={!frete}
        loading={criarPedido.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  acaoLarga: {
    width: '100%',
    marginTop: Spacing.three,
  },
  secao: {
    gap: Spacing.two,
  },
  secaoTitulo: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  opcaoTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  resumo: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.two,
  },
  resumoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLinha: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  totalValor: {
    fontSize: 24,
    lineHeight: 30,
  },
});
