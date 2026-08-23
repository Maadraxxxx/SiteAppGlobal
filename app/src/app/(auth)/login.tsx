import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(undefined);
    setLoading(true);
    try {
      await login(email.trim(), senha);
      router.replace('/(tabs)/perfil');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ gap: Spacing.three }}>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextField label="Senha" value={senha} onChangeText={setSenha} secureTextEntry />
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
      <Button title="Entrar" onPress={handleSubmit} loading={loading} />
      <Link href="/(auth)/register">
        <ThemedText type="link" themeColor="primary">
          Ainda nao tem conta? Criar conta
        </ThemedText>
      </Link>
    </Screen>
  );
}
