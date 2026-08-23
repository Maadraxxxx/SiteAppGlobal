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
      <Stack.Screen name="categorias/index" options={{ title: 'Categorias' }} />
      <Stack.Screen name="categorias/[id]" options={{ title: 'Categoria' }} />
      <Stack.Screen name="produtos/index" options={{ title: 'Produtos' }} />
      <Stack.Screen name="produtos/[id]" options={{ title: 'Produto' }} />
      <Stack.Screen name="formatos/index" options={{ title: 'Formatos' }} />
      <Stack.Screen name="estilos/index" options={{ title: 'Estilos' }} />
    </Stack>
  );
}
