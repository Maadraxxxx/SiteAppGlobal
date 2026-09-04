import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { BotaoVoltar } from '@/components/BotaoVoltar';
import { IntroVideo } from '@/components/IntroVideo';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { CABECALHO } from '@/constants/cabecalho';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { PagamentoProvider } from '@/context/PagamentoContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Precisa rodar no arranque do app, nao dentro da tela de login: o Google
// redireciona pra raiz do site, entao o popup abre na Home. Daqui ele devolve
// o resultado pra aba que iniciou o login e se fecha, em vez de logar dentro
// do proprio popup e deixar a aba original parada no "Entrar".
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

/**
 * Impede print e gravacao de tela enquanto o app esta aberto.
 *
 * So vale no celular: no navegador nao existe API nenhuma pra isso, entao o
 * site continua printavel — nao ha o que fazer ali. No iPhone funciona do iOS
 * 13 pra cima; no Android e a mesma flag que os apps de banco usam, que alem de
 * bloquear o print deixa a miniatura em branco na lista de apps abertos.
 */
/**
 * Desligado a pedido do Gabriel enquanto ele testa o app — com o bloqueio
 * ligado ele nao consegue tirar print pra mostrar o que esta vendo. Pra voltar
 * a proteger, troque pra true: nao ha mais nada a mexer.
 */
const BLOQUEAR_PRINT = false;

function useBloquearPrint() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    if (!BLOQUEAR_PRINT) {
      // Libera de propósito: a trava vale enquanto o app está aberto, e sem
      // isto ela continuaria de pé numa sessão que começou com ela ligada.
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      return;
    }

    // Aparelho sem suporte: nao ha alternativa, e derrubar a abertura do app
    // por causa disso seria pior que permitir o print.
    ScreenCapture.preventScreenCaptureAsync().catch(() => {});

    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
    };
  }, []);
}

/**
 * Decide se a abertura toca e com qual video — o admin controla os dois pelo
 * painel. Fica num componente proprio porque precisa do QueryClientProvider,
 * que so existe dentro do RootLayout.
 */
function Abertura({ onFim }: { onFim: () => void }) {
  const { data, isLoading } = useConfiguracao();
  const desligada = !!data && !data.configuracao.introVideoAtivo;

  useEffect(() => {
    if (desligada) onFim();
  }, [desligada, onFim]);

  // Enquanto a configuracao nao chega, nada aparece: tocar o video e so depois
  // descobrir que ele esta desligado seria pior que o instante de espera. A
  // tela de abertura do sistema ainda esta por cima nesse momento.
  if (isLoading || desligada) return null;

  // Sem configuracao (servidor fora do ar, aparelho sem rede) cai no video
  // embutido, em vez de deixar o cliente sem abertura nenhuma.
  return <IntroVideo onFim={onFim} videoUrl={data?.configuracao.introVideoUrl} />;
}

export default function RootLayout() {
  useBloquearPrint();
  // Abertura da marca: toca uma vez ao abrir e some sozinha no fim.
  const [mostrandoIntro, setMostrandoIntro] = useState(true);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Fraunces_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <PagamentoProvider>
          <ThemeProvider
            value={{
              ...DefaultTheme,
              colors: { ...DefaultTheme.colors, primary: Colors.light.primary, background: Colors.light.background },
            }}>
            {/* headerLeft aqui em cima vale pra todas as telas com cabeçalho: a
                seta nativa some quando não há histórico (link aberto direto,
                página recarregada no navegador) e deixava o cliente sem saída.
                É um círculo cheio na cor da marca, igual em toda tela. */}
            <Stack
              screenOptions={{
                headerShown: false,
                headerLeft: () => <BotaoVoltar />,
                ...CABECALHO,
              }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)/login" options={{ headerShown: true, title: 'Entrar' }} />
              <Stack.Screen name="(auth)/register" options={{ headerShown: true, title: 'Criar conta' }} />
              <Stack.Screen
                name="(auth)/esqueci-senha"
                options={{ headerShown: true, title: 'Recuperar senha' }}
              />
              <Stack.Screen
                name="redefinir-senha"
                options={{ headerShown: true, title: 'Nova senha' }}
              />
              {/* Cabeçalho liso, só com a seta: o banner da marca competia com
                  a foto do produto logo abaixo. Sem ele sai também o tint
                  branco, que deixaria a seta invisível no fundo claro. */}
              <Stack.Screen name="produto/[id]" options={{ headerShown: true, title: '' }} />
              <Stack.Screen name="carrinho" options={{ headerShown: true, title: 'Carrinho' }} />
              <Stack.Screen name="pedidos" options={{ headerShown: true, title: 'Meus Pedidos' }} />
              <Stack.Screen name="pedido/[id]" options={{ headerShown: true, title: 'Pedido' }} />
              <Stack.Screen name="enderecos" options={{ headerShown: true, title: 'Meus Endereços' }} />
              <Stack.Screen name="checkout" options={{ headerShown: true, title: 'Finalizar compra' }} />
              <Stack.Screen name="rastreio/[id]" options={{ headerShown: true, title: 'Rastreamento' }} />
              <Stack.Screen name="pagamento/[id]" options={{ headerShown: true, title: 'Pagamento' }} />
              <Stack.Screen name="editar-perfil" options={{ headerShown: true, title: 'Editar Perfil' }} />
              <Stack.Screen name="admin" />
              <Stack.Screen name="+not-found" />
            </Stack>

            {/* Por cima de tudo, some sozinho quando o vídeo acaba. Fica dentro
                dos providers pra o app já estar montado por trás quando sair. */}
            {mostrandoIntro ? <Abertura onFim={() => setMostrandoIntro(false)} /> : null}
          </ThemeProvider>
          </PagamentoProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
