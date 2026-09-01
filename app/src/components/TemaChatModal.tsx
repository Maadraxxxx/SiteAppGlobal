import type { CompraCreditoIA, Produto, SaldoIA } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { iaApi } from '@/api/ia';
import { produtosApi } from '@/api/produtos';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/hooks/use-theme';
import { Button } from './Button';
import { ThemedText } from './themed-text';

function moeda(valor: number) {
  return `R$ ${(valor || 0).toFixed(2).replace('.', ',')}`;
}

interface Mensagem {
  id: string;
  autor: 'bot' | 'voce';
  texto?: string;
  /** Resposta com imagem: vem junto o id, pra poder encomendar essa arte. */
  geracao?: { id: string; imagemUrl: string; tema: string };
  erro?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  produto: Produto;
}

export function TemaChatModal({ visible, onClose, produto }: Props) {
  // O Modal ocupa a tela inteira, inclusive a faixa do relogio e da bateria e a
  // do indicador de inicio. Sem estas margens o cabecalho fica por baixo delas
  // no iPhone.
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { addItem } = useCart();

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
  const [saldo, setSaldo] = useState<SaldoIA>();
  const [compra, setCompra] = useState<CompraCreditoIA>();
  const [comprando, setComprando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [adicionado, setAdicionado] = useState<string>();

  // Carrega o saldo ao abrir, pra já mostrar quantas restam hoje.
  useEffect(() => {
    if (!visible) return;
    iaApi
      .saldo()
      .then(({ saldo }) => setSaldo(saldo))
      .catch(() => setSaldo(undefined));
  }, [visible]);

  // Enquanto o PIX dos créditos não cai, pergunta ao servidor de tempos em tempos.
  useEffect(() => {
    if (!compra || compra.status !== 'PENDENTE') return;
    const timer = setInterval(async () => {
      try {
        const { compra: atual } = await iaApi.consultarCompra(compra.id);
        if (atual.status !== 'PENDENTE') {
          setCompra(undefined);
          const { saldo } = await iaApi.saldo();
          setSaldo(saldo);
        }
      } catch {
        // rede instável: tenta de novo no próximo ciclo
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [compra]);

  async function handleEnviar() {
    const tema = input.trim();
    if (!tema || gerando) return;

    setMensagens((prev) => [...prev, { id: `u-${Date.now()}`, autor: 'voce', texto: tema }]);
    setInput('');
    setGerando(true);

    try {
      const { geracaoId, imagemUrl, saldo: novoSaldo } = await produtosApi.gerarImagemIA(produto.id, tema);
      setSaldo(novoSaldo);
      setMensagens((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, autor: 'bot', geracao: { id: geracaoId, imagemUrl, tema } },
      ]);
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
      iaApi.saldo().then(({ saldo }) => setSaldo(saldo)).catch(() => {});
    } finally {
      setGerando(false);
    }
  }

  async function handleComprar(quantidade: number) {
    setComprando(true);
    try {
      const { compra } = await iaApi.comprarCreditos(quantidade);
      setCompra(compra);
    } catch (err) {
      setMensagens((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          autor: 'bot',
          erro: true,
          texto: err instanceof Error ? err.message : 'Nao foi possivel gerar o pagamento',
        },
      ]);
    } finally {
      setComprando(false);
    }
  }

  async function handleCopiar() {
    if (!compra?.qrCodeCopiaCola) return;
    await Clipboard.setStringAsync(compra.qrCodeCopiaCola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function handleEncomendar(geracao: { id: string; imagemUrl: string; tema: string }) {
    addItem(produto, 1, geracao);
    setAdicionado(geracao.id);
    setTimeout(() => setAdicionado(undefined), 2500);
  }

  const semSaldo = saldo && !saldo.podeGerar;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderColor: theme.border, paddingTop: insets.top + Spacing.four }]}>
          <View style={styles.headerTexto}>
            <ThemedText type="smallBold">Personalizar com IA</ThemedText>
            {saldo ? (
              <ThemedText type="small" themeColor="textSecondary">
                {saldo.gratuitasRestantes > 0
                  ? `${saldo.gratuitasRestantes} de ${saldo.gratuitasPorDia} grátis hoje`
                  : saldo.creditos > 0
                    ? `${saldo.creditos} ${saldo.creditos === 1 ? 'crédito' : 'créditos'}`
                    : 'Sem gerações disponíveis'}
              </ThemedText>
            ) : null}
          </View>
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

              {msg.geracao ? (
                <>
                  <Image source={{ uri: msg.geracao.imagemUrl }} style={styles.geradaImagem} contentFit="cover" />
                  <ThemedText type="small" themeColor="textSecondary">
                    Quer esse? Sai por {moeda(Number(produto.preco))}, o mesmo preço do original.
                  </ThemedText>
                  <Button
                    title={adicionado === msg.geracao.id ? 'Adicionado ✓' : 'Encomendar este'}
                    onPress={() => handleEncomendar(msg.geracao as NonNullable<Mensagem['geracao']>)}
                  />
                </>
              ) : null}
            </View>
          ))}

          {gerando ? (
            <View style={[styles.bubble, styles.bubbleLeft, { backgroundColor: theme.backgroundElement }]}>
              <ActivityIndicator color={theme.primary} />
              <ThemedText type="small" themeColor="textSecondary">
                Criando sua arte... leva uns 30 segundos.
              </ThemedText>
            </View>
          ) : null}

          {/* Acabaram as gerações: oferece a compra ali mesmo */}
          {semSaldo && !compra ? (
            <View style={[styles.aviso, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">Suas gerações de hoje acabaram</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Você tem {saldo?.gratuitasPorDia} grátis por dia. Para continuar agora, cada geração
                custa {moeda(saldo?.precoGeracao ?? 0)}.
              </ThemedText>
              <View style={styles.compraBotoes}>
                <View style={styles.compraBotao}>
                  <Button title="1 geração" variant="ghost" onPress={() => handleComprar(1)} loading={comprando} />
                </View>
                <View style={styles.compraBotao}>
                  <Button title="5 gerações" onPress={() => handleComprar(5)} loading={comprando} />
                </View>
              </View>
            </View>
          ) : null}

          {/* PIX dos créditos */}
          {compra ? (
            <View style={[styles.aviso, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">
                Pague {moeda(Number(compra.valor))} para liberar {compra.quantidade}{' '}
                {compra.quantidade === 1 ? 'geração' : 'gerações'}
              </ThemedText>
              {compra.qrCodeBase64 ? (
                <Image
                  source={{ uri: `data:image/png;base64,${compra.qrCodeBase64}` }}
                  style={styles.qr}
                  contentFit="contain"
                />
              ) : null}
              {compra.qrCodeCopiaCola ? (
                <Button title={copiado ? 'Copiado!' : 'Copiar código PIX'} variant="ghost" onPress={handleCopiar} />
              ) : null}
              <View style={styles.aguardando}>
                <ActivityIndicator size="small" color={theme.primary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Aguardando o pagamento...
                </ThemedText>
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Atalho pro carrinho quando já encomendou algo */}
        {adicionado ? (
          <Pressable
            onPress={() => {
              onClose();
              router.push('/carrinho');
            }}
            style={[styles.irCarrinho, { backgroundColor: theme.primary }]}>
            <Ionicons name="cart" size={18} color={theme.primaryText} />
            <ThemedText type="smallBold" themeColor="primaryText">
              Ir para o carrinho
            </ThemedText>
          </Pressable>
        ) : null}

        <View
          style={[
            styles.inputRow,
            { borderColor: theme.border, paddingBottom: insets.bottom + Spacing.three },
          ]}>
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
  headerTexto: {
    gap: Spacing.half,
  },
  messages: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  bubble: {
    maxWidth: '85%',
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
    width: 240,
    aspectRatio: 1,
    borderRadius: Radius.small,
  },
  aviso: {
    alignSelf: 'stretch',
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.two,
    alignItems: 'center',
  },
  compraBotoes: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignSelf: 'stretch',
  },
  compraBotao: {
    flex: 1,
  },
  qr: {
    width: 200,
    height: 200,
    borderRadius: Radius.small,
  },
  aguardando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  irCarrinho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
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
