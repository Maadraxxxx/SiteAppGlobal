import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { produtosApi } from '@/api/produtos';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

interface Mensagem {
  id: string;
  autor: 'bot' | 'voce';
  texto?: string;
  imagemUrl?: string;
  erro?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  produtoId: string;
}

export function TemaChatModal({ visible, onClose, produtoId }: Props) {
  const theme = useTheme();
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: 'intro',
      autor: 'bot',
      texto:
        'Me conta o tema que você quer pra esse painel (cores, época do ano, estilo...) que eu adapto a imagem pra você.',
    },
  ]);
  const [input, setInput] = useState('');
  const [gerando, setGerando] = useState(false);

  async function handleEnviar() {
    const tema = input.trim();
    if (!tema || gerando) return;

    const userMsg: Mensagem = { id: `u-${Date.now()}`, autor: 'voce', texto: tema };
    setMensagens((prev) => [...prev, userMsg]);
    setInput('');
    setGerando(true);

    try {
      const { imagemUrl } = await produtosApi.gerarImagemIA(produtoId, tema);
      setMensagens((prev) => [...prev, { id: `b-${Date.now()}`, autor: 'bot', imagemUrl }]);
    } catch (err) {
      setMensagens((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          autor: 'bot',
          erro: true,
          texto: err instanceof Error ? err.message : 'Erro ao gerar imagem',
        },
      ]);
    } finally {
      setGerando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderColor: theme.border }]}>
          <ThemedText type="smallBold">Personalizar com IA</ThemedText>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.messages}>
          {mensagens.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.autor === 'voce' ? styles.bubbleRight : styles.bubbleLeft,
                { backgroundColor: msg.autor === 'voce' ? theme.primary : theme.backgroundElement },
              ]}>
              {msg.texto ? (
                <ThemedText
                  type="small"
                  themeColor={msg.autor === 'voce' ? 'primaryText' : msg.erro ? 'danger' : 'text'}>
                  {msg.texto}
                </ThemedText>
              ) : null}
              {msg.imagemUrl ? (
                <Image source={{ uri: msg.imagemUrl }} style={styles.geradaImagem} contentFit="cover" />
              ) : null}
            </View>
          ))}
          {gerando ? (
            <View style={[styles.bubble, styles.bubbleLeft, { backgroundColor: theme.backgroundElement }]}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.inputRow, { borderColor: theme.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ex: tema de Natal, vermelho e dourado"
            placeholderTextColor={theme.textSecondary}
            editable={!gerando}
            onSubmitEditing={handleEnviar}
            style={[
              styles.inputBox,
              { backgroundColor: theme.backgroundElement, color: theme.text, fontFamily: Fonts.sans },
            ]}
          />
          <Pressable
            onPress={handleEnviar}
            disabled={!input.trim() || gerando}
            style={[styles.sendButton, { backgroundColor: theme.primary, opacity: !input.trim() || gerando ? 0.5 : 1 }]}>
            <Ionicons name="send" size={18} color={theme.primaryText} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderBottomWidth: 1,
  },
  messages: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bubbleLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  geradaImagem: {
    width: 220,
    aspectRatio: 1,
    borderRadius: Radius.small,
  },
  inputRow: {
    flexDirection: 'row',
    padding: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  inputBox: {
    flex: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
