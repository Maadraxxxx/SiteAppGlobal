import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Largura do arquivo gerado. Acima disso o ganho não aparece e o upload pesa. */
const LARGURA_SAIDA = 1400;
const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const PASSO_ZOOM = 0.2;

interface Props {
  /** Imagem escolhida pelo cliente, ainda inteira. */
  uri: string;
  /** Proporção do recorte — a mesma do lugar onde a foto vai aparecer. */
  aspect: [number, number];
  onConfirmar: (uriRecortada: string) => void;
  onCancelar: () => void;
}

/**
 * Recorte com moldura, zoom e arraste, no formato exato de onde a foto vai
 * aparecer.
 *
 * Existe porque na web o `allowsEditing` do seletor de imagens não faz nada:
 * a foto subia inteira e só era cortada na hora de exibir, então o admin
 * escolhia uma imagem e descobria o enquadramento depois. Aqui ele vê a
 * moldura certa — proporção e cantos arredondados — e decide o corte.
 *
 * O recorte em si é feito num canvas, então esta tela é da web. No app nativo
 * quem corta é o editor do próprio sistema, que já vem no seletor.
 */
export function RecorteDeImagem({ uri, aspect, onConfirmar, onCancelar }: Props) {
  const theme = useTheme();
  const { width: janela, height: alturaJanela } = useWindowDimensions();

  const [tamanhoOriginal, setTamanhoOriginal] = useState<{ l: number; a: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [deslocamento, setDeslocamento] = useState({ x: 0, y: 0 });
  const [erro, setErro] = useState<string>();

  // O arraste precisa do valor mais recente sem re-registrar o PanResponder a
  // cada quadro, e um ref entrega isso sem recriar o gesto.
  const inicioDoArraste = useRef({ x: 0, y: 0 });
  const estado = useRef({ zoom: 1, deslocamento: { x: 0, y: 0 }, original: null as { l: number; a: number } | null });
  estado.current = { zoom, deslocamento, original: tamanhoOriginal };

  // A moldura ocupa a largura disponível, com teto pra não virar um bloco
  // gigante no desktop, e ainda tem que sobrar tela pros botões.
  const larguraQuadro = Math.min(janela - Spacing.four * 2, 520);
  const alturaQuadro = Math.min((larguraQuadro * aspect[1]) / aspect[0], alturaJanela * 0.55);
  const larguraReal = (alturaQuadro * aspect[0]) / aspect[1];
  const quadro = { l: Math.min(larguraQuadro, larguraReal), a: alturaQuadro };

  useEffect(() => {
    let ativo = true;
    const img = new window.Image();
    img.onload = () => {
      if (ativo) setTamanhoOriginal({ l: img.naturalWidth, a: img.naturalHeight });
    };
    img.src = uri;
    return () => {
      ativo = false;
    };
  }, [uri]);

  /** Menor escala que ainda cobre a moldura inteira — o "cover" do CSS. */
  function escalaBase(original: { l: number; a: number }) {
    return Math.max(quadro.l / original.l, quadro.a / original.a);
  }

  /** Impede arrastar até sobrar borda vazia dentro da moldura. */
  function limitar(x: number, y: number, z: number, original: { l: number; a: number }) {
    const escala = escalaBase(original) * z;
    const folgaX = Math.max(0, (original.l * escala - quadro.l) / 2);
    const folgaY = Math.max(0, (original.a * escala - quadro.a) / 2);
    return {
      x: Math.max(-folgaX, Math.min(folgaX, x)),
      y: Math.max(-folgaY, Math.min(folgaY, y)),
    };
  }

  const gesto = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        inicioDoArraste.current = estado.current.deslocamento;
      },
      onPanResponderMove: (_evento, movimento) => {
        const { original, zoom: z } = estado.current;
        if (!original) return;
        setDeslocamento(
          limitar(
            inicioDoArraste.current.x + movimento.dx,
            inicioDoArraste.current.y + movimento.dy,
            z,
            original,
          ),
        );
      },
    }),
  ).current;

  function mudarZoom(delta: number) {
    if (!tamanhoOriginal) return;
    const novo = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom + delta));
    setZoom(novo);
    // Reposiciona junto: ao afastar, o que estava na borda passaria a deixar
    // espaço vazio dentro da moldura.
    setDeslocamento((atual) => limitar(atual.x, atual.y, novo, tamanhoOriginal));
  }

  function handleConfirmar() {
    if (!tamanhoOriginal) return;

    const escala = escalaBase(tamanhoOriginal) * zoom;
    // Canto superior esquerdo da moldura, em coordenadas da imagem original.
    const sx = (tamanhoOriginal.l * escala) / 2 - quadro.l / 2 - deslocamento.x;
    const sy = (tamanhoOriginal.a * escala) / 2 - quadro.a / 2 - deslocamento.y;

    const saidaL = LARGURA_SAIDA;
    const saidaA = Math.round((LARGURA_SAIDA * aspect[1]) / aspect[0]);

    const canvas = document.createElement('canvas');
    canvas.width = saidaL;
    canvas.height = saidaA;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(
        img,
        sx / escala,
        sy / escala,
        quadro.l / escala,
        quadro.a / escala,
        0,
        0,
        saidaL,
        saidaA,
      );
      try {
        // JPEG e não PNG: são fotos, e o PNG de uma foto grande fica pesado à toa.
        onConfirmar(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        // Só acontece com imagem de outro domínio, que o navegador se recusa a
        // ler do canvas. A foto escolhida do aparelho é sempre local, mas se um
        // dia vier de fora, é melhor avisar que travar em silêncio.
        setErro('Não deu para recortar esta imagem. Escolha outra foto do seu aparelho.');
      }
    };
    img.onerror = () => setErro('Não deu para abrir esta imagem.');
    img.src = uri;
  }

  const escala = tamanhoOriginal ? escalaBase(tamanhoOriginal) * zoom : 1;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancelar}>
      <View style={[styles.fundo, { backgroundColor: theme.background }]}>
        <View style={styles.topo}>
          <ThemedText type="subtitle">Enquadrar</ThemedText>
          <Pressable onPress={onCancelar} hitSlop={8}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.dica}>
          Arraste para escolher a parte da foto e use os botões para aproximar. O
          que estiver dentro da moldura é exatamente o que vai aparecer.
        </ThemedText>

        {/* A moldura tem a proporção e os cantos do lugar de destino, e corta o
            que passa dela — é a prévia e o recorte ao mesmo tempo. */}
        <View
          style={[styles.quadro, { width: quadro.l, height: quadro.a, borderColor: theme.border }]}
          {...gesto.panHandlers}>
          {tamanhoOriginal ? (
            // Um <img> puro, e não o expo-image: aqui é preciso posicionar em
            // pixel exato, e o mesmo cálculo alimenta o recorte no canvas.
            <img
              src={uri}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                width: tamanhoOriginal.l * escala,
                height: tamanhoOriginal.a * escala,
                left: quadro.l / 2 - (tamanhoOriginal.l * escala) / 2 + deslocamento.x,
                top: quadro.a / 2 - (tamanhoOriginal.a * escala) / 2 + deslocamento.y,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          ) : null}
        </View>

        <View style={styles.zoom}>
          <Pressable
            onPress={() => mudarZoom(-PASSO_ZOOM)}
            disabled={zoom <= ZOOM_MIN}
            style={[styles.zoomBotao, { borderColor: theme.border, opacity: zoom <= ZOOM_MIN ? 0.4 : 1 }]}>
            <Ionicons name="remove" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            {Math.round(zoom * 100)}%
          </ThemedText>
          <Pressable
            onPress={() => mudarZoom(PASSO_ZOOM)}
            disabled={zoom >= ZOOM_MAX}
            style={[styles.zoomBotao, { borderColor: theme.border, opacity: zoom >= ZOOM_MAX ? 0.4 : 1 }]}>
            <Ionicons name="add" size={20} color={theme.text} />
          </Pressable>
        </View>

        {erro ? (
          <ThemedText type="small" themeColor="danger" style={styles.dica}>
            {erro}
          </ThemedText>
        ) : null}

        <View style={styles.acoes}>
          <Button title="Usar esta imagem" onPress={handleConfirmar} disabled={!tamanhoOriginal} />
          <Button title="Cancelar" variant="ghost" onPress={onCancelar} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dica: {
    textAlign: 'center',
  },
  quadro: {
    alignSelf: 'center',
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'hidden',
    // O RN só aceita auto/pointer aqui; serve pra sinalizar que a moldura
    // responde ao toque.
    cursor: 'pointer',
  },
  zoom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  zoomBotao: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acoes: {
    gap: Spacing.two,
    marginTop: 'auto',
  },
});
