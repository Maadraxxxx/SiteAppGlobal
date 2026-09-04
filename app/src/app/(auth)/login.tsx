import { StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { GoogleButton } from '@/components/GoogleButton';
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
    <Screen maxWidth={480} style={{ gap: Spacing.three }}>
      <TextField
        label="E-mail"
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

      {/* Logo abaixo do Entrar, que e onde a pessoa esta olhando quando a
          senha nao funciona. */}
      <Link href="/(auth)/esqueci-senha" style={styles.esqueci}>
        <ThemedText type="small" themeColor="primary">
          Esqueci minha senha
        </ThemedText>
      </Link>

      <GoogleButton onSucesso={() => router.replace('/(tabs)/perfil')} />
      <Link href="/(auth)/register">
        <ThemedText type="link" themeColor="primary">
          Ainda não tem conta? Criar conta
        </ThemedText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  esqueci: {
    alignSelf: 'center',
  },
});
