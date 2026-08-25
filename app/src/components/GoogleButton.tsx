import * as Google from 'expo-auth-session/providers/google';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

// O maybeCompleteAuthSession() fica no _layout raiz, nao aqui: o Google
// redireciona pra raiz do site, onde este componente nem esta montado.

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

/** O "G" oficial do Google, nos traçados e cores da marca deles. */
function GoogleG({ tamanho = 18 }: { tamanho?: number }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
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
});
