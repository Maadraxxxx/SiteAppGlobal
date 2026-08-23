import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
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

  const navTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const brandColors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <ThemeProvider
            value={{
              ...navTheme,
              colors: { ...navTheme.colors, primary: brandColors.primary, background: brandColors.background },
            }}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)/login" options={{ headerShown: true, title: 'Entrar' }} />
              <Stack.Screen name="(auth)/register" options={{ headerShown: true, title: 'Criar conta' }} />
              <Stack.Screen name="produto/[id]" options={{ headerShown: true, title: '' }} />
              <Stack.Screen name="carrinho" options={{ headerShown: true, title: 'Carrinho' }} />
              <Stack.Screen name="admin" />
              <Stack.Screen name="+not-found" />
            </Stack>
          </ThemeProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
