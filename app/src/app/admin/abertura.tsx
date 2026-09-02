import { Ionicons } from '@expo/vector-icons';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { fetch as expoFetch } from 'expo/fetch';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { configuracoesApi } from '@/api/configuracoes';
import { useAtualizarConfiguracao, useConfiguracao } from '@/hooks/useConfiguracao';
import { useTheme } from '@/hooks/use-theme';

/** Acima disso o envio demora demais no 4G do celular pra valer a pena. */
const LIMITE_MB = 50;

function Previa({ url }: { url: string }) {
  const player = useVideoPlayer({ uri: url }, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return <VideoView player={player} style={styles.previa} contentFit="contain" nativeControls={false} />;
}

export default function AdminAberturaScreen() {
  const { data, isLoading } = useConfiguracao();
  const atualizar = useAtualizarConfiguracao();
  const theme = useTheme();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string>();

  const configuracao = data?.configuracao;

  async function handleEscolher() {
    setError(undefined);

    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      setError('Permissão de acesso à galeria negada');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });
    if (resultado.canceled || !resultado.assets[0]) return;

    const arquivo = resultado.assets[0];
    const tamanhoMb = (arquivo.fileSize ?? 0) / (1024 * 1024);
    if (tamanhoMb > LIMITE_MB) {
      setError(`Vídeo muito grande (${tamanhoMb.toFixed(0)}MB). O limite é ${LIMITE_MB}MB.`);
      return;
    }

    setEnviando(true);
    try {
      const nome = arquivo.fileName ?? `abertura-${Date.now()}.mp4`;
      // O arquivo vai direto pro armazenamento: passando pelo servidor, a
      // Vercel cortaria a requisição em poucos megabytes.
      const { urlDeEnvio, urlPublica } = await configuracoesApi.urlDeEnvio(nome);

      const cabecalhos = { 'Content-Type': arquivo.mimeType ?? 'video/mp4' };

      // No celular o arquivo vai em fluxo, sem passar inteiro pela memória —
      // um vídeo de dezenas de megabytes carregado de uma vez derruba o app.
      // Na web não existe esse caminho, e o blob resolve.
      const envio =
        Platform.OS === 'web'
          ? await fetch(urlDeEnvio, {
              method: 'PUT',
              headers: cabecalhos,
              body: await fetch(arquivo.uri).then((r) => r.blob()),
            })
          : await expoFetch(urlDeEnvio, {
              method: 'PUT',
              headers: cabecalhos,
              body: new File(arquivo.uri),
            });

      if (!envio.ok) throw new Error(`Falha ao enviar o vídeo (${envio.status})`);

      await atualizar.mutateAsync({ introVideoUrl: urlPublica });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para enviar o vídeo');
    } finally {
      setEnviando(false);
    }
  }

  async function handleAlternar(ativo: boolean) {
    setError(undefined);
    try {
      await atualizar.mutateAsync({ introVideoAtivo: ativo });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para salvar');
    }
  }

  async function handleVoltarAoPadrao() {
    setError(undefined);
    try {
      await atualizar.mutateAsync({ introVideoUrl: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para salvar');
    }
  }

  if (isLoading) {
    return (
      <Screen style={styles.centro}>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen maxWidth={640} style={styles.tela}>
      <View style={[styles.cartao, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.linha}>
          <View style={styles.linhaTexto}>
            <ThemedText type="smallBold">Mostrar a abertura</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Desligado, o app abre direto na tela inicial.
            </ThemedText>
          </View>
          <Switch
            value={configuracao?.introVideoAtivo ?? true}
            onValueChange={handleAlternar}
            disabled={atualizar.isPending}
            trackColor={{ true: theme.primary, false: theme.border }}
          />
        </View>
      </View>

      <View style={styles.bloco}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.rotulo}>
          Vídeo de abertura
        </ThemedText>

        <View style={[styles.previaCaixa, { backgroundColor: theme.backgroundElement }]}>
          {configuracao?.introVideoUrl ? (
            <Previa url={configuracao.introVideoUrl} />
          ) : (
            <View style={styles.previaVazia}>
              <Ionicons name="film-outline" size={28} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
                Usando o vídeo que vem no app
              </ThemedText>
            </View>
          )}
        </View>

        {enviando ? (
          <View style={styles.enviando}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="small" themeColor="textSecondary">
              Enviando o vídeo...
            </ThemedText>
          </View>
        ) : (
          <Button title="Escolher outro vídeo" onPress={handleEscolher} />
        )}

        {configuracao?.introVideoUrl && !enviando ? (
          <Pressable onPress={handleVoltarAoPadrao} hitSlop={8} style={styles.voltarPadrao}>
            <ThemedText type="small" themeColor="primary">
              Voltar ao vídeo original
            </ThemedText>
          </Pressable>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary">
          MP4 de até {LIMITE_MB}MB. Vídeo curto é melhor: a abertura segura o
          cliente antes da loja, e o arquivo é baixado toda vez que o app abre.
        </ThemedText>
      </View>

      {error ? (
        <View style={[styles.erro, { borderColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.erroTexto}>
            {error}
          </ThemedText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: {
    gap: Spacing.four,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralizado: {
    textAlign: 'center',
  },
  cartao: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  linhaTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  bloco: {
    gap: Spacing.three,
  },
  rotulo: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  previaCaixa: {
    borderRadius: Radius.medium,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previa: {
    width: '100%',
    height: '100%',
  },
  previaVazia: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  enviando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  voltarPadrao: {
    alignSelf: 'center',
  },
  erro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  erroTexto: {
    flex: 1,
  },
});
