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
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { BotaoVoltar } from '@/components/BotaoVoltar';
import { IntroVideo } from '@/components/IntroVideo';
import { CABECALHO } from '@/constants/cabecalho';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Precisa rodar no arranque do app, nao dentro da tela de login: o Google
// redireciona pra raiz do site, entao o popup abre na Home. Daqui ele devolve
// o resultado pra aba que iniciou o login e se fecha, em vez de logar dentro
// do proprio popup e deixar a aba original parada no "Entrar".
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

export default function RootLayout() {
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
            {mostrandoIntro ? <IntroVideo onFim={() => setMostrandoIntro(false)} /> : null}
          </ThemeProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
