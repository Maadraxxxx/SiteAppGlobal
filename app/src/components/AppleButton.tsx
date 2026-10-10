import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from './themed-text';

/**
 * Rodando dentro do Expo Go, e não no app instalado.
 *
 * Lá o login com a Apple não tem como funcionar: quem pede o token é o app da
 * Expo, então ele sai em nome dela, e o servidor recusa de propósito — aceitar
 * deixaria qualquer projeto aberto no Expo Go entrar na conta de quem fizesse
 * login nele. O botão aparece, pra dar pra ver a tela, mas avisa em vez de
 * tentar e devolver um "login inválido" que pareceria defeito.
 */
const NO_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Se dá pra entrar com a Apple neste aparelho.
 *
 * Só existe no iPhone e no iPad — no Android e no site a resposta é sempre
 * não. Começa em `false` e só vira depois de perguntar ao sistema, pra o botão
 * nunca piscar na tela de quem não pode usar.
 */
export function useAppleDisponivel() {
  const [disponivel, setDisponivel] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let montado = true;
    AppleAuthentication.isAvailableAsync()
      .then((sim) => {
        if (montado) setDisponivel(sim);
      })
      .catch(() => {});

    return () => {
      montado = false;
    };
  }, []);

  return disponivel;
}

/**
 * "Entrar com a Apple", exigido pela App Store em todo app que oferece login
 * por outra conta (aqui, a do Google).
 *
 * O botão é o da própria Apple, e não um desenhado por nós: ela exige o
 * desenho oficial, e é o sistema quem escreve o texto no idioma do aparelho.
 * Quem usa precisa conferir `useAppleDisponivel()` antes de montar.
 */
export function AppleButton({ onSucesso }: { onSucesso: () => void }) {
  const { loginComApple } = useAuth();
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState<string>();

  async function entrar() {
    if (entrando) return;

    if (NO_EXPO_GO) {
      setError('O login com a Apple só funciona no app instalado (TestFlight ou App Store). No Expo Go ele fica desligado.');
      return;
    }

    setError(undefined);
    setEntrando(true);

    try {
      const credencial = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credencial.identityToken) {
        throw new Error('A Apple não devolveu o token de acesso');
      }

      // A Apple só entrega o nome na primeira vez que a pessoa autoriza o app.
      // Vai junto pro servidor porque depois disso não há de onde tirá-lo.
      const nome = [credencial.fullName?.givenName, credencial.fullName?.familyName]
        .filter(Boolean)
        .join(' ');

      await loginComApple({
        identityToken: credencial.identityToken,
        authorizationCode: credencial.authorizationCode ?? undefined,
        nome: nome || undefined,
      });
      onSucesso();
    } catch (err) {
      // Fechou a janela da Apple: só destrava o botão, sem mensagem de erro
      // pra quem simplesmente desistiu.
      if ((err as { code?: string } | undefined)?.code === 'ERR_REQUEST_CANCELED') return;
      setError(err instanceof Error ? err.message : 'Não foi possível entrar com a Apple');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={{ opacity: entrando ? 0.6 : 1 }}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={Radius.medium}
          style={styles.botao}
          onPress={entrar}
        />
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger" style={styles.erro}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  // Largura e altura são obrigatórias: sem elas o botão da Apple não aparece.
  // A altura acompanha a do botão do Google, pra nenhum dos dois parecer o
  // "principal" — a Apple pede que o dela não fique menor que os outros.
  botao: {
    width: '100%',
    height: 52,
  },
  erro: {
    textAlign: 'center',
  },
});
