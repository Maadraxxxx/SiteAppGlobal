import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(undefined);
    setLoading(true);
    try {
      await register(nome.trim(), email.trim(), senha);
      router.replace('/(tabs)/perfil');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel criar a conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={{ gap: Spacing.three }}>
      <TextField label="Nome" value={nome} onChangeText={setNome} />
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
      <Button title="Criar conta" onPress={handleSubmit} loading={loading} />
      <Link href="/(auth)/login">
        <ThemedText type="link" themeColor="primary">
          Ja tem conta? Entrar
        </ThemedText>
      </Link>
    </Screen>
  );
}
