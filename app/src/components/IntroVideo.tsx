import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

const VIDEO = require('@/assets/video/intro.mp4');

/** Rede ruim ou codec sem suporte: some sozinho em vez de prender o cliente na porta. */
const LIMITE_MS = 15000;

/**
 * O Safari do iPhone só toca vídeo automaticamente se o elemento tiver
 * `playsinline` e `muted` como atributos — sem eles ele recusa e a tela fica
 * preta. O expo-video não expõe isso, então marcamos direto no elemento.
 * Só faz sentido no navegador; no app nativo já toca embutido.
 */
function marcarParaTocarEmbutido(no: HTMLElement | null) {
  const video = no?.querySelector?.('video') as HTMLVideoElement | null;
  if (!video) return false;

  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.muted = true;
  video.setAttribute('muted', '');
  return true;
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

  // Dar play no callback de criação não pega no web: naquele momento a fonte
  // ainda não carregou e a chamada se perde. Esperar o "readyToPlay" resolve.
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') player.play();
    // Fonte quebrada não pode deixar a abertura travada na frente da loja.
    if (status === 'error') encerrar();
  });

  useEventListener(player, 'playToEnd', encerrar);

  useEffect(() => {
    const timer = setTimeout(encerrar, LIMITE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // O <video> pode não existir no primeiro instante; tenta por alguns frames
    // e para assim que marcar.
    let tentativas = 0;
    const timer = setInterval(() => {
      const no = containerRef.current as unknown as HTMLElement | null;
      if (marcarParaTocarEmbutido(no) || ++tentativas > 20) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  if (saindo) return null;

  return (
    <View ref={containerRef} style={styles.container}>
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
    backgroundColor: '#000000',
    zIndex: 100,
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
