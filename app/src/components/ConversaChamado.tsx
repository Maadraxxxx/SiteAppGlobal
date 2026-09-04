import type { MensagemChamado, StatusChamado } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

const ROTULO: Record<StatusChamado, string> = {
  ABERTO: 'Aguardando a loja',
  RESPONDIDO: 'Respondido',
  RESOLVIDO: 'Resolvido',
};

/** A etiqueta de status, com a mesma leitura nas duas pontas. */
export function TagChamado({ status }: { status: StatusChamado }) {
  const theme = useTheme();
  const cor = status === 'RESOLVIDO' ? theme.textSecondary : theme.primary;

  return (
    <View style={[styles.tag, { borderColor: cor }]}>
      <View style={[styles.bolinha, { backgroundColor: cor }]} />
      <ThemedText type="small" style={{ color: cor }}>
        {ROTULO[status]}
      </ThemedText>
    </View>
  );
}

function quando(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  mensagens: MensagemChamado[];
  /**
   * Quem está lendo. Muda de que lado cada balão fica: a própria fala vai
   * sempre à direita, como em qualquer conversa.
   */
  souLoja?: boolean;
  onEnviar: (texto: string) => Promise<unknown>;
  enviando?: boolean;
  /** Conversa encerrada continua legível, mas sem campo de escrita. */
  encerrada?: boolean;
}

export function ConversaChamado({ mensagens, souLoja, onEnviar, enviando, encerrada }: Props) {
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string>();
  const theme = useTheme();

  async function handleEnviar() {
    const limpo = texto.trim();
    if (!limpo) return;

    setErro(undefined);
    try {
      await onEnviar(limpo);
      setTexto('');
    } catch (err) {
      // O texto fica no campo de propósito: perder o que se acabou de
      // escrever por causa de uma falha de rede é pior que o erro em si.
      setErro(err instanceof Error ? err.message : 'Não deu para enviar');
    }
  }

  return (
    <View style={styles.container}>
      {mensagens.map((mensagem) => {
        const minha = souLoja ? mensagem.autor === 'LOJA' : mensagem.autor === 'CLIENTE';

        return (
          <View
            key={mensagem.id}
            style={[
              styles.balao,
              minha ? styles.balaoDireita : styles.balaoEsquerda,
              { backgroundColor: minha ? theme.primary : theme.backgroundElement },
            ]}>
            <ThemedText type="small" themeColor={minha ? 'primaryText' : 'text'}>
              {mensagem.texto}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor={minha ? 'primaryText' : 'textSecondary'}
              style={styles.hora}>
              {mensagem.autor === 'LOJA' ? 'Loja' : 'Você'} · {quando(mensagem.createdAt)}
            </ThemedText>
          </View>
        );
      })}

      {encerrada ? (
        <View style={[styles.encerrada, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="checkmark-circle-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            Este atendimento foi encerrado.
          </ThemedText>
        </View>
      ) : (
        <View>
          <View style={[styles.campo, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="Escreva sua mensagem"
              placeholderTextColor={theme.textSecondary}
              multiline
              editable={!enviando}
              style={[styles.input, { color: theme.text, fontFamily: Fonts.sans }]}
            />
            <Pressable
              onPress={handleEnviar}
              disabled={!texto.trim() || enviando}
              accessibilityRole="button"
              accessibilityLabel="Enviar mensagem"
              style={[
                styles.enviar,
                { backgroundColor: theme.primary, opacity: !texto.trim() || enviando ? 0.5 : 1 },
              ]}>
              {enviando ? (
                <ActivityIndicator size="small" color={theme.primaryText} />
              ) : (
                <Ionicons name="send" size={16} color={theme.primaryText} />
              )}
            </Pressable>
          </View>

          {erro ? (
            <ThemedText type="small" themeColor="danger" style={styles.erro}>
              {erro}
            </ThemedText>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  bolinha: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  balao: {
    maxWidth: '85%',
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  balaoDireita: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: Radius.small,
  },
  balaoEsquerda: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: Radius.small,
  },
  hora: {
    fontSize: 11,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 15,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: Spacing.two,
    outlineWidth: 0,
  },
  enviar: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  encerrada: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    marginTop: Spacing.two,
  },
  erro: {
    marginTop: Spacing.one,
  },
});
