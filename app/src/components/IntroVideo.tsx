import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

const VIDEO = require('@/assets/video/intro.mp4');

/** Rede ruim ou codec sem suporte: some sozinho em vez de prender o cliente na porta. */
const LIMITE_CARREGANDO_MS = 15000;
/** Depois que começa a tocar, o limite é a duração do vídeo com folga. */
const LIMITE_TOCANDO_MS = 14000;
/** Quanto esperar pra decidir se o vídeo realmente saiu do lugar. */
const ESPERA_PLAY_MS = 2000;
/** Quanto o convite pra tocar fica na tela antes de entrar na loja sozinho. */
const ESPERA_TOQUE_MS = 4500;

type Fase = 'carregando' | 'tocando' | 'oferecendo';

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
  const [fase, setFase] = useState<Fase>('carregando');
  const [saindo, setSaindo] = useState(false);
  const containerRef = useRef<View>(null);
  // Ref (e não state) porque o timeout e o evento de fim podem chegar juntos, e
  // o state só atualiza no próximo render — dava pra chamar onFim duas vezes.
  const jaSaiu = useRef(false);
  const limite = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(VIDEO, (player) => {
    player.loop = false;
    // Autoplay com som é bloqueado pelo navegador; mudo passa.
    player.muted = true;
  });

  function armarLimite(ms: number) {
    if (limite.current) clearTimeout(limite.current);
    limite.current = setTimeout(encerrar, ms);
  }

  function encerrar() {
    if (jaSaiu.current) return;
    jaSaiu.current = true;
    if (limite.current) clearTimeout(limite.current);
    setSaindo(true);
    onFim();
  }

  /** Só encerra se de fato não andou — o vídeo pode ter começado no meio tempo. */
  function encerrarSeParado() {
    if (player.currentTime > 0.1) return;
    encerrar();
  }

  /**
   * O iPhone bloqueia o autoplay quando está em Modo de Baixo Consumo ou com a
   * reprodução automática desligada — é trava do sistema, nenhum código
   * contorna. Em vez de engolir a abertura, oferecemos: um toque é gesto do
   * usuário, e com gesto o iOS libera. Quem não tocar entra na loja sozinho,
   * pra abertura nunca virar um muro na porta da loja.
   */
  function oferecerToque() {
    if (jaSaiu.current || player.currentTime > 0.1) return;
    setFase('oferecendo');
    armarLimite(ESPERA_TOQUE_MS);
  }

  /**
   * `aoFalhar` separa os dois caminhos: quando o autoplay é recusado ainda vale
   * convidar pro toque, mas quando é o próprio toque que falha não há segunda
   * carta na manga — aí a abertura sai de cena na hora.
   */
  function tocar(aoFalhar: () => void, tentativa = 0) {
    if (Platform.OS !== 'web') {
      player.play();
      setFase('tocando');
      return;
    }

    const video = elementoDeVideo(containerRef.current);
    // O status pode chegar antes do React montar o <video>. Esperar alguns
    // quadros é bem melhor que desistir da abertura por uma corrida de tempo.
    if (!video) {
      if (tentativa < 20) setTimeout(() => tocar(aoFalhar, tentativa + 1), 50);
      else encerrar();
      return;
    }

    marcarParaTocarEmbutido(video);
    // No navegador o play() devolve uma promessa que **rejeita** quando o
    // autoplay é negado: é o sinal exato, na hora, sem adivinhar por tempo.
    const promessa = video.play() as Promise<void> | undefined;
    if (!promessa?.then) return setFase('tocando');

    promessa.then(() => {
      if (jaSaiu.current) return;
      setFase('tocando');
      armarLimite(LIMITE_TOCANDO_MS);
    }, aoFalhar);
  }

  // Dar play no callback de criação não pega no web: naquele momento a fonte
  // ainda não carregou e a chamada se perde. Esperar o "readyToPlay" resolve.
  useEventListener(player, 'statusChange', ({ status }) => {
    // Fonte quebrada não pode deixar a abertura travada na frente da loja.
    if (status === 'error') return encerrar();
    if (status !== 'readyToPlay') return;

    tocar(oferecerToque);

    // Segunda rede, pra quando o play() é aceito mas nada anda — o Chrome faz
    // isso com vídeo mudo em aba de segundo plano: aceita e para sozinho.
    setTimeout(oferecerToque, ESPERA_PLAY_MS);
  });

  useEventListener(player, 'playToEnd', encerrar);

  useEffect(() => {
    armarLimite(LIMITE_CARREGANDO_MS);
    return () => {
      if (limite.current) clearTimeout(limite.current);
    };
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

  function aoTocarNoConvite() {
    // O toque é a última tentativa: se nem com gesto o vídeo anda, entra na
    // loja em vez de deixar o cliente olhando uma tela parada.
    armarLimite(LIMITE_TOCANDO_MS);
    tocar(encerrar);
    setTimeout(encerrarSeParado, ESPERA_PLAY_MS);
  }

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

      {fase === 'oferecendo' ? (
        // Cobre a tela inteira: o toque em qualquer lugar vale como gesto.
        <Pressable onPress={aoTocarNoConvite} style={styles.convite}>
          <Image
            source={require('@/assets/images/hero-logo.png')}
            style={styles.fundoLogo}
            contentFit="contain"
          />
          <View style={styles.conviteChamada}>
            <Ionicons name="play-circle" size={28} color={Colors.light.primaryText} />
            <ThemedText type="smallBold" style={styles.conviteTexto}>
              Toque para ver a abertura
            </ThemedText>
          </View>
        </Pressable>
      ) : null}

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
  convite: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    backgroundColor: Colors.light.primary,
  },
  conviteChamada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  conviteTexto: {
    color: Colors.light.primaryText,
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
