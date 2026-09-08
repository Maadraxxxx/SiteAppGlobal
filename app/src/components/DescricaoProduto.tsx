import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type NativeSyntheticEvent, type TextLayoutEventData } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

/** Quantas linhas ficam à mostra enquanto a descrição está recolhida. */
const LINHAS = 2;

/**
 * Acima disso já se assume que há mais texto do que cabe nas duas linhas.
 *
 * É só o palpite inicial: o `onTextLayout` corrige logo depois, comparando o
 * que coube com o texto inteiro. O palpite existe porque nem toda plataforma
 * dispara esse evento, e sem ele o botão de expandir sumiria — deixando a
 * descrição cortada sem saída.
 */
const PALPITE_LONGA = 140;

/**
 * Descrição do produto, recolhida em duas linhas.
 *
 * As descrições da loja são longas e carregam a medida do painel no meio —
 * inteiras na tela, empurravam preço e botão de comprar para fora da vista.
 * Recolhida, a página cabe; e o aviso em laranja existe porque o que está
 * escondido aqui não é enfeite, é informação que muda a compra.
 */
export function DescricaoProduto({ texto }: { texto: string }) {
  const theme = useTheme();
  const [aberta, setAberta] = useState(false);
  const [temMais, setTemMais] = useState(texto.trim().length > PALPITE_LONGA);

  function medir(evento: NativeSyntheticEvent<TextLayoutEventData>) {
    // Com `numberOfLines`, só chegam aqui as linhas que couberam. Somando o
    // texto delas e comparando com o original dá pra saber se sobrou coisa,
    // sem depender do tamanho da fonte nem da largura da tela.
    if (aberta) return;
    const visivel = evento.nativeEvent.lines.map((linha) => linha.text).join('');
    setTemMais(visivel.trim().length < texto.trim().length);
  }

  return (
    <View style={styles.bloco}>
      <View style={styles.cabecalho}>
        <ThemedText type="smallBold">Descrição</ThemedText>

        {temMais ? (
          <View style={[styles.aviso, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="alert-circle" size={13} color={theme.primary} />
            <ThemedText type="small" themeColor="primary">
              Atenção: leia a descrição
            </ThemedText>
          </View>
        ) : null}
      </View>

      <ThemedText
        themeColor="textSecondary"
        style={styles.texto}
        numberOfLines={aberta ? undefined : LINHAS}
        onTextLayout={medir}>
        {texto}
      </ThemedText>

      {temMais ? (
        <Pressable
          onPress={() => setAberta((antes) => !antes)}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.botao,
            { borderColor: theme.primary, opacity: pressed ? 0.6 : 1 },
          ]}>
          <ThemedText type="smallBold" themeColor="primary">
            {aberta ? 'Ver menos' : 'Ler descrição completa'}
          </ThemedText>
          <Ionicons
            name={aberta ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.primary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloco: {
    gap: Spacing.two,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  texto: {
    lineHeight: 20,
  },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
