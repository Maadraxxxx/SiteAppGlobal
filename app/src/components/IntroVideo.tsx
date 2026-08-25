import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

const VIDEO = require('@/assets/video/intro.mp4');

/** Rede ruim ou codec sem suporte: some sozinho em vez de prender o cliente na porta. */
const LIMITE_MS = 15000;
/** Quanto esperar pra decidir se o vídeo realmente saiu do lugar. */
const ESPERA_PLAY_MS = 2000;

function elementoDeVideo(no: View | null) {
  const html = no as unknown as HTMLElement | null;
  return (html?.querySelector?.('video') as HTMLVideoElement | null) ?? null;
}

/**
 * O Safari do iPhone só toca sozinho se o elemento tiver `playsinline` e
 * `muted` como atributos no momento do play — sem eles ele recusa, e a recusa
 * não é tentada de novo. O expo-video não expõe isso, então marcamos direto.
 */
function marcarParaTocarEmbutido(video: HTMLVideoElement) {
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.muted = true;
  video.setAttribute('muted', '');
}

export function IntroVideo({ onFim }: { onFim: () => void }) {
  const [saindo, setSaindo] = useState(false);
  const containerRef = useRef<View>(null);
  // Ref (e não state) porque o timeout e o evento de fim podem chegar juntos, e
  // o state só atualiza no próximo render — dava pra chamar onFim duas vezes.
  const jaSaiu = useRef(false);

  const player = useVideoPlayer(VIDEO, (player) => {
    player.loop = false;
    // Autoplay com som é bloqueado pelo navegador; mudo passa.
    player.muted = true;
  });

  function encerrar() {
    if (jaSaiu.current) return;
    jaSaiu.current = true;
    setSaindo(true);
    onFim();
  }

  /**
   * No navegador o play() do elemento devolve uma promessa que **rejeita**
   * quando o autoplay é recusado (iPhone sem permissão, Modo de Baixo Consumo,
   * aba em segundo plano). É o sinal exato de que não vai tocar — melhor que
   * ficar adivinhando por tempo. Recusou, a abertura sai de cena na hora: ir
   * direto pra loja é muito melhor que encarar uma tela parada.
   */
  function tocar(tentativa = 0) {
    if (Platform.OS !== 'web') {
      player.play();
      return;
    }

    const video = elementoDeVideo(containerRef.current);
    // O status pode chegar antes do React montar o <video>. Esperar alguns
    // quadros é bem melhor que desistir da abertura por uma corrida de tempo.
    if (!video) {
      if (tentativa < 20) setTimeout(() => tocar(tentativa + 1), 50);
      else encerrar();
      return;
    }

    marcarParaTocarEmbutido(video);
    const promessa = video.play() as Promise<void> | undefined;
    promessa?.catch(() => encerrar());
  }

  // Dar play no callback de criação não pega no web: naquele momento a fonte
  // ainda não carregou e a chamada se perde. Esperar o "readyToPlay" resolve.
  useEventListener(player, 'statusChange', ({ status }) => {
    // Fonte quebrada não pode deixar a abertura travada na frente da loja.
    if (status === 'error') return encerrar();
    if (status !== 'readyToPlay') return;

    tocar();

    // Segunda rede, pra quando o play() resolve mas nada anda — foi o que o
    // Chrome faz com vídeo mudo em aba de segundo plano: aceita o play e para
    // sozinho depois. Sem isso a abertura ficaria parada até o limite.
    setTimeout(() => {
      if (jaSaiu.current || player.currentTime > 0.1) return;
      encerrar();
    }, ESPERA_PLAY_MS);
  });

  useEventListener(player, 'playToEnd', encerrar);

  useEffect(() => {
    const timer = setTimeout(encerrar, LIMITE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O <video> pode não existir no primeiro instante e o statusChange pode
  // chegar antes dele: marca assim que aparecer, pra que o play() já encontre
  // os atributos no lugar.
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let tentativas = 0;
    const timer = setInterval(() => {
      const video = elementoDeVideo(containerRef.current);
      if (video) marcarParaTocarEmbutido(video);
      if (video || ++tentativas > 20) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  if (saindo) return null;

  return (
    <View ref={containerRef} style={styles.container}>
      {/* Fica atrás do vídeo. Se ele tocar, some coberto; enquanto carrega, é
          isso que o cliente vê — a marca, não um retângulo preto. */}
      <View style={styles.fundo}>
        <Image
          source={require('@/assets/images/hero-logo.png')}
          style={styles.fundoLogo}
          contentFit="contain"
        />
      </View>

      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />

      {/* Quem já viu não precisa esperar os 10 segundos de novo. */}
      <Pressable onPress={encerrar} style={styles.pular} hitSlop={8}>
        <ThemedText type="smallBold" style={styles.pularTexto}>
          Pular
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    // Cor da marca em vez de preto: é o que aparece enquanto o vídeo carrega.
    backgroundColor: Colors.light.primary,
    zIndex: 100,
  },
  fundo: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fundoLogo: {
    width: 180,
    aspectRatio: 16 / 9,
  },
  video: {
    flex: 1,
  },
  pular: {
    position: 'absolute',
    top: Spacing.six,
    right: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pularTexto: {
    color: Colors.light.primaryText,
  },
});
