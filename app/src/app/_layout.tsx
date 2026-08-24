import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

export default function RootLayout() {
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
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)/login" options={{ headerShown: true, title: 'Entrar' }} />
              <Stack.Screen name="(auth)/register" options={{ headerShown: true, title: 'Criar conta' }} />
              <Stack.Screen
                name="produto/[id]"
                options={{
                  headerShown: true,
                  title: '',
                  headerTintColor: '#FFFFFF',
                  headerBackground: () => (
                    <Image
                      source={require('@/assets/images/header-banner.jpg')}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ),
                }}
              />
              <Stack.Screen name="carrinho" options={{ headerShown: true, title: 'Carrinho' }} />
              <Stack.Screen name="pedidos" options={{ headerShown: true, title: 'Meus Pedidos' }} />
              <Stack.Screen name="enderecos" options={{ headerShown: true, title: 'Meus Endereços' }} />
              <Stack.Screen name="checkout" options={{ headerShown: true, title: 'Finalizar compra' }} />
              <Stack.Screen name="pagamento/[id]" options={{ headerShown: true, title: 'Pagamento' }} />
              <Stack.Screen name="editar-perfil" options={{ headerShown: true, title: 'Editar Perfil' }} />
              <Stack.Screen name="admin" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </ThemeProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
