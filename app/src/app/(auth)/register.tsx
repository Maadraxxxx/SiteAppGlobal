import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { GoogleButton } from '@/components/GoogleButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const MIN_SENHA = 6;

export default function RegisterScreen() {
  const { register } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [confirmaEmail, setConfirmaEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  // Erro por campo, mostrado abaixo dele — mais direto que uma mensagem só no fim.
  const emailDiferente = confirmaEmail.length > 0 && email.trim().toLowerCase() !== confirmaEmail.trim().toLowerCase();
  const senhaDiferente = confirmaSenha.length > 0 && senha !== confirmaSenha;
  const senhaCurta = senha.length > 0 && senha.length < MIN_SENHA;

  async function handleSubmit() {
    if (!nome.trim() || !email.trim() || !senha) {
      setError('Preencha nome, e-mail e senha.');
      return;
    }
    // Comparação sem diferenciar maiúsculas: e-mail não é sensível a caixa,
    // e reprovar por isso seria só irritante.
    if (email.trim().toLowerCase() !== confirmaEmail.trim().toLowerCase()) {
      setError('Os e-mails não são iguais.');
      return;
    }
    if (senha.length < MIN_SENHA) {
      setError(`A senha precisa de pelo menos ${MIN_SENHA} caracteres.`);
      return;
    }
    if (senha !== confirmaSenha) {
      setError('As senhas não são iguais.');
      return;
    }

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
    <Screen maxWidth={480} style={{ gap: Spacing.three }}>
      <TextField label="Nome" value={nome} onChangeText={setNome} />

      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <TextField
        label="Confirme o e-mail"
        value={confirmaEmail}
        onChangeText={setConfirmaEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        error={emailDiferente ? 'Os e-mails não são iguais' : undefined}
      />

      <TextField
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        error={senhaCurta ? `Mínimo de ${MIN_SENHA} caracteres` : undefined}
      />
      <TextField
        label="Confirme a senha"
        value={confirmaSenha}
        onChangeText={setConfirmaSenha}
        secureTextEntry
        error={senhaDiferente ? 'As senhas não são iguais' : undefined}
      />

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button title="Criar conta" onPress={handleSubmit} loading={loading} />

      <GoogleButton onSucesso={() => router.replace('/(tabs)/perfil')} />
      <Link href="/(auth)/login">
        <ThemedText type="link" themeColor="primary">
          Já tem conta? Entrar
        </ThemedText>
      </Link>
    </Screen>
  );
}
