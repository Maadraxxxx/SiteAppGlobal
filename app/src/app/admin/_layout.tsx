import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
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
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Painel Admin' }} />
      <Stack.Screen name="pedidos/index" options={{ title: 'Pedidos' }} />
      <Stack.Screen name="produtos/index" options={{ title: 'Produtos' }} />
      <Stack.Screen name="produtos/[id]" options={{ title: 'Produto' }} />
      <Stack.Screen name="banners/index" options={{ title: 'Carrossel da Home' }} />
    </Stack>
  );
}
