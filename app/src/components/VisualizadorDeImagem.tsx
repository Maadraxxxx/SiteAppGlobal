import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  /** A imagem aberta. Nulo mantém o visualizador fechado. */
  uri?: string | null;
  onFechar: () => void;
  /** Aparece embaixo da foto — o nome do produto, o tema encomendado. */
  legenda?: string;
}

/**
 * Foto em tela cheia. As miniaturas do carrinho e da lista de pedidos são
 * pequenas demais pra conferir a arte encomendada, e no detalhe do produto a
 * imagem divide espaço com preço e botões.
 *
 * O fundo é escuro nos dois temas do app: aqui a única coisa que importa é a
 * foto, e uma moldura clara roubava atenção dela. Por isso a legenda e o texto
 * são brancos fixos, sem passar pelo tema.
 */
export function VisualizadorDeImagem({ uri, onFechar, legenda }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onFechar}>
      {/* Tocar em qualquer lugar do fundo fecha: é o gesto que todo mundo
          tenta primeiro, antes de procurar o X. */}
      <Pressable style={styles.fundo} onPress={onFechar}>
        {/* A foto tem tamanho em porcentagem, e não calculado: dimensão de
            janela chega a vir zerada em certos momentos, e aí a imagem
            simplesmente não aparecia. Assim quem resolve é o layout. */}
        {uri ? (
          <Image source={{ uri }} style={styles.foto} contentFit="contain" transition={150} />
        ) : null}
      </Pressable>

      {legenda ? (
        <View style={[styles.legenda, { bottom: insets.bottom + Spacing.six }]} pointerEvents="none">
          <Ionicons name="pricetag" size={14} color="#FFFFFF" />
          <Text style={styles.legendaTexto} numberOfLines={2}>
            {legenda}
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={onFechar}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        style={({ pressed }) => [
          styles.fechar,
          { top: insets.top + Spacing.three, backgroundColor: theme.primary, opacity: pressed ? 0.7 : 1 },
        ]}>
        <Ionicons name="close" size={20} color={theme.primaryText} />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foto: {
    width: '100%',
    height: '75%',
  },
  fechar: {
    position: 'absolute',
    right: Spacing.four,
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legenda: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: '85%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  legendaTexto: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontFamily: Fonts.sans,
    fontSize: 14,
  },
});
