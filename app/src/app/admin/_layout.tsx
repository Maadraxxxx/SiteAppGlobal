import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { BotaoVoltar } from '@/components/BotaoVoltar';
import { CABECALHO } from '@/constants/cabecalho';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout() {
  const { usuario, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!usuario || usuario.role !== 'ADMIN') {
    return <Redirect href="/(tabs)/perfil" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        // Mesma seta do resto do app: sem histórico ela leva pra Home em vez
        // de sumir e deixar o admin preso na tela.
        headerLeft: () => <BotaoVoltar />,
        ...CABECALHO,
      }}>
      <Stack.Screen name="index" options={{ title: 'Painel Admin' }} />
      <Stack.Screen name="financeiro" options={{ title: 'Financeiro' }} />
      <Stack.Screen name="pedidos/index" options={{ title: 'Pedidos' }} />
      <Stack.Screen name="produtos/index" options={{ title: 'Produtos' }} />
      <Stack.Screen name="produtos/[id]" options={{ title: 'Produto' }} />
      <Stack.Screen name="banners/index" options={{ title: 'Carrossel da Home' }} />
      <Stack.Screen name="categorias" options={{ title: 'Categorias na Home' }} />
    </Stack>
  );
}
