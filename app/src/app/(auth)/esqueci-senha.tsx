import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { authApi } from '@/api/auth';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function EsqueciSenhaScreen() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string>();
  const theme = useTheme();

  async function handleEnviar() {
    if (!email.trim()) {
      setErro('Escreva o e-mail da sua conta');
      return;
    }

    setErro(undefined);
    setCarregando(true);
    try {
      await authApi.esqueciSenha(email.trim());
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não deu para enviar agora');
    } finally {
      setCarregando(false);
    }
  }

  // A confirmação não afirma que o e-mail existe: o servidor responde igual
  // nos dois casos, e a tela precisa contar a mesma história.
  if (enviado) {
    return (
      <Screen maxWidth={480} style={styles.tela}>
        <View style={[styles.selo, { backgroundColor: theme.primary }]}>
          <Ionicons name="mail-outline" size={24} color={theme.primaryText} />
        </View>

        <ThemedText type="subtitle" style={styles.centralizado}>
          Verifique seu e-mail
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
          Se existir uma conta com <ThemedText type="smallBold">{email.trim()}</ThemedText>, o link
          para criar uma nova senha já está a caminho. Ele vale por 30 minutos.
        </ThemedText>

        <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
          Não chegou? Olhe no spam antes de pedir de novo.
        </ThemedText>

        <Button title="Voltar para entrar" onPress={() => router.replace('/(auth)/login')} />
      </Screen>
    );
  }

  return (
    <Screen maxWidth={480} style={styles.tela}>
      <ThemedText type="subtitle">Esqueceu a senha?</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Escreva o e-mail da sua conta e mandamos um link para você criar uma nova.
      </ThemedText>

      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        error={erro}
        placeholder="voce@exemplo.com"
      />

      <Button title="Enviar link" onPress={handleEnviar} loading={carregando} />

      <Button title="Voltar" variant="ghost" onPress={() => router.back()} disabled={carregando} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: {
    gap: Spacing.three,
  },
  centralizado: {
    textAlign: 'center',
  },
  selo: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
