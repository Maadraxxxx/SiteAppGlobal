import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Explica o campo sem poluir o rótulo. Some quando há erro. */
  hint?: string;
  /** Marca visual de campo obrigatório, ao lado do rótulo. */
  obrigatorio?: boolean;
  /** Vai colado antes do valor — "R$" num preço. */
  prefixo?: string;
  /** Vai colado depois do valor — "cm", "kg". */
  sufixo?: string;
}

export function TextField({
  label,
  error,
  hint,
  obrigatorio,
  prefixo,
  sufixo,
  style,
  onFocus,
  onBlur,
  multiline,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [focado, setFocado] = useState(false);

  // A borda é o que separa o campo do cartão; ela ganha a cor da marca em foco
  // pra dizer onde a digitação vai cair.
  const corDaBorda = error ? theme.danger : focado ? theme.primary : theme.border;

  return (
    <View style={styles.container}>
      <View style={styles.rotulo}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {obrigatorio ? (
          <ThemedText type="small" themeColor="primary">
            *
          </ThemedText>
        ) : null}
      </View>

      {/* O fundo do campo é o da página, e não o do cartão: dentro de uma seção
          os dois eram a mesma cor e o campo sumia — a tela inteira virava um
          bloco liso sem nada parecendo digitável. */}
      <View
        style={[
          styles.caixa,
          {
            backgroundColor: theme.background,
            borderColor: corDaBorda,
            // Só em foco, e discreto: destaca o campo ativo sem transformar o
            // formulário numa sequência de molduras grossas.
            borderWidth: focado || error ? 2 : 1,
            paddingVertical: multiline ? Spacing.two : 0,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}>
        {prefixo ? (
          <ThemedText type="small" themeColor="textSecondary">
            {prefixo}
          </ThemedText>
        ) : null}

        <TextInput
          placeholderTextColor={theme.textSecondary}
          multiline={multiline}
          onFocus={(e) => {
            setFocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: theme.text,
              fontFamily: Fonts.sans,
              height: multiline ? 96 : 48,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            style,
          ]}
          {...rest}
        />

        {sufixo ? (
          <ThemedText type="small" themeColor="textSecondary">
            {sufixo}
          </ThemedText>
        ) : null}
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  rotulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  caixa: {
    flexDirection: 'row',
    gap: Spacing.two,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 16,
    // Sem isto o navegador desenha o contorno de foco dele por cima da nossa
    // borda. Zerar a largura funciona nos tipos novos do RN 0.86, onde
    // outlineStyle deixou de aceitar 'none'.
    outlineWidth: 0,
  },
});
