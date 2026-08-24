import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

// Fecha a aba de login assim que o Google devolve o resultado.
WebBrowser.maybeCompleteAuthSession();

const CLIENT_IDS = {
  web: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB,
  ios: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
  android: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
};

/** Sem client ID configurado o botão nem aparece, em vez de quebrar ao clicar. */
export const googleDisponivel = !!(CLIENT_IDS.web || CLIENT_IDS.ios || CLIENT_IDS.android);

/**
 * Casca que decide se o botão existe. O hook do Google lança se nenhum client
 * ID estiver configurado, e hook não pode ficar dentro de `if` — por isso ele
 * vive no componente de dentro, que só monta quando há configuração.
 */
export function GoogleButton(props: { onSucesso: () => void }) {
  if (!googleDisponivel) return null;
  return <BotaoGoogle {...props} />;
}

function BotaoGoogle({ onSucesso }: { onSucesso: () => void }) {
  const { loginComGoogle } = useAuth();
  const theme = useTheme();
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string>();

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: CLIENT_IDS.web,
    iosClientId: CLIENT_IDS.ios,
    androidClientId: CLIENT_IDS.android,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type !== 'success') {
      // Cancelou ou deu erro: só destrava o botão, sem mensagem de erro pra
      // quem simplesmente desistiu.
      setEntrando(false);
      return;
    }

    const idToken = response.params?.id_token;
    if (!idToken) {
      setError('O Google nao devolveu o token de acesso');
      setEntrando(false);
      return;
    }

    (async () => {
      try {
        await loginComGoogle(idToken);
        onSucesso();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Nao foi possivel entrar com o Google');
      } finally {
        setEntrando(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return (
    <View style={styles.container}>
      <View style={styles.divisor}>
        <View style={[styles.linha, { backgroundColor: theme.border }]} />
        <ThemedText type="small" themeColor="textSecondary">
          ou
        </ThemedText>
        <View style={[styles.linha, { backgroundColor: theme.border }]} />
      </View>

      <Pressable
        disabled={!request || entrando}
        onPress={() => {
          setError(undefined);
          setEntrando(true);
          promptAsync();
        }}
        style={({ pressed }) => [
          styles.botao,
          {
            backgroundColor: theme.background,
            borderColor: theme.border,
            opacity: !request || entrando ? 0.6 : pressed ? 0.8 : 1,
          },
        ]}>
        {entrando ? (
          <ActivityIndicator size="small" color={theme.text} />
        ) : (
          <>
            <GoogleG />
            <ThemedText type="smallBold">Entrar com Google</ThemedText>
          </>
        )}
      </Pressable>

      {error ? (
        <ThemedText type="small" themeColor="danger" style={styles.erro}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** O "G" do Google nas quatro cores da marca. */
function GoogleG() {
  return (
    <View style={styles.logo}>
      <View style={[styles.quadrante, styles.qA, { backgroundColor: '#4285F4' }]} />
      <View style={[styles.quadrante, styles.qB, { backgroundColor: '#EA4335' }]} />
      <View style={[styles.quadrante, styles.qC, { backgroundColor: '#FBBC05' }]} />
      <View style={[styles.quadrante, styles.qD, { backgroundColor: '#34A853' }]} />
      <View style={styles.logoCentro} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  linha: {
    flex: 1,
    height: 1,
  },
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  erro: {
    textAlign: 'center',
  },
  logo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
  },
  quadrante: {
    position: 'absolute',
    width: 9,
    height: 9,
  },
  qA: { top: 0, left: 0 },
  qB: { top: 0, right: 0 },
  qC: { bottom: 0, left: 0 },
  qD: { bottom: 0, right: 0 },
  logoCentro: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
