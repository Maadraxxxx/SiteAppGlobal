import type { OpcaoFrete } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { freteApi, type ItemFrete } from '@/api/frete';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

function moeda(valor: number) {
  const [inteiro, centavos] = (valor || 0).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

/** 12345678 -> 12345-678, pra ficar legivel enquanto digita. */
function formatarCep(valor: string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos;
}

export function CalculadoraFrete({
  itens,
  cep,
  onCepChange,
  selecionado,
  onSelecionar,
}: {
  itens: ItemFrete[];
  cep: string;
  onCepChange: (cep: string) => void;
  selecionado?: OpcaoFrete;
  onSelecionar: (opcao: OpcaoFrete | undefined) => void;
}) {
  const theme = useTheme();
  const [opcoes, setOpcoes] = useState<OpcaoFrete[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [error, setError] = useState<string>();

  const digitos = cep.replace(/\D/g, '');

  async function handleCalcular() {
    if (digitos.length !== 8) {
      setError('Digite os 8 números do CEP');
      return;
    }
    setError(undefined);
    setCarregando(true);
    onSelecionar(undefined);
    try {
      const { opcoes: resultado } = await freteApi.cotar(digitos, itens);
      setOpcoes(resultado);
      if (!resultado.length) setError('Nenhuma transportadora atende esse CEP');
    } catch (err) {
      setOpcoes([]);
      setError(err instanceof Error ? err.message : 'Nao foi possivel calcular o frete');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Entrega</ThemedText>

      <View style={styles.linhaCep}>
        <View style={[styles.campo, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Ionicons name="location-outline" size={18} color={theme.textSecondary} />
          <TextInput
            value={cep}
            onChangeText={(v) => {
              onCepChange(formatarCep(v));
              setError(undefined);
            }}
            placeholder="Seu CEP"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            maxLength={9}
            onSubmitEditing={handleCalcular}
            style={[styles.input, { color: theme.text, fontFamily: Fonts.sans }]}
          />
        </View>
        <Pressable
          onPress={handleCalcular}
          disabled={carregando}
          style={[styles.botao, { backgroundColor: theme.primary, opacity: carregando ? 0.6 : 1 }]}>
          {carregando ? (
            <ActivityIndicator size="small" color={theme.primaryText} />
          ) : (
            <ThemedText type="smallBold" themeColor="primaryText">
              Calcular
            </ThemedText>
          )}
        </Pressable>
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      {opcoes.map((opcao) => {
        const escolhida = selecionado?.id === opcao.id;
        return (
          <Pressable
            key={opcao.id}
            onPress={() => onSelecionar(escolhida ? undefined : opcao)}
            style={[
              styles.opcao,
              {
                backgroundColor: escolhida ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: escolhida ? theme.primary : 'transparent',
              },
            ]}>
            <Ionicons
              name={escolhida ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={escolhida ? theme.primary : theme.textSecondary}
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
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  linhaCep: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  botao: {
    height: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
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
});
