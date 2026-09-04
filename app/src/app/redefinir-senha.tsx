import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { authApi } from '@/api/auth';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MINIMO = 6;

export default function RedefinirSenhaScreen() {
  // Chega pelo link do e-mail: /redefinir-senha?token=...
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [pronto, setPronto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<{ senha?: string; confirmacao?: string }>({});
  const [erro, setErro] = useState<string>();
  const theme = useTheme();

  async function handleSalvar() {
    const novos: typeof erros = {};
    if (senha.length < MINIMO) novos.senha = `Use pelo menos ${MINIMO} caracteres`;
    if (confirmacao !== senha) novos.confirmacao = 'As duas senhas estão diferentes';

    setErros(novos);
    if (Object.keys(novos).length || !token) return;

    setErro(undefined);
    setCarregando(true);
    try {
      await authApi.redefinirSenha(token, senha);
      setPronto(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não deu para trocar a senha');
    } finally {
      setCarregando(false);
    }
  }

  // Sem token não há o que fazer aqui: quem abriu a tela direto, ou com um
  // link cortado pelo cliente de e-mail, precisa recomeçar o pedido.
  if (!token) {
    return (
      <Screen maxWidth={480} style={styles.tela}>
        <View style={[styles.selo, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="link-outline" size={24} color={theme.textSecondary} />
        </View>
        <ThemedText type="subtitle" style={styles.centralizado}>
          Link incompleto
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
          Abra o endereço direto do e-mail que você recebeu, ou peça a recuperação de novo.
        </ThemedText>
        <Button title="Pedir de novo" onPress={() => router.replace('/(auth)/esqueci-senha')} />
      </Screen>
    );
  }

  if (pronto) {
    return (
      <Screen maxWidth={480} style={styles.tela}>
        <View style={[styles.selo, { backgroundColor: theme.primary }]}>
          <Ionicons name="checkmark" size={26} color={theme.primaryText} />
        </View>
        <ThemedText type="subtitle" style={styles.centralizado}>
          Senha alterada
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
          Já pode entrar com a senha nova.
        </ThemedText>
        <Button title="Entrar" onPress={() => router.replace('/(auth)/login')} />
      </Screen>
    );
  }

  return (
    <Screen maxWidth={480} style={styles.tela}>
      <ThemedText type="subtitle">Criar uma nova senha</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Escolha uma senha de pelo menos {MINIMO} caracteres.
      </ThemedText>

      <TextField
        label="Nova senha"
        obrigatorio
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        autoComplete="new-password"
        error={erros.senha}
      />
      <TextField
        label="Repita a nova senha"
        obrigatorio
        value={confirmacao}
        onChangeText={setConfirmacao}
        secureTextEntry
        autoComplete="new-password"
        error={erros.confirmacao}
      />

      {erro ? (
        <View style={[styles.erro, { borderColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.erroTexto}>
            {erro}
          </ThemedText>
        </View>
      ) : null}

      <Button title="Salvar senha" onPress={handleSalvar} loading={carregando} />
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
  erro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  erroTexto: {
    flex: 1,
  },
});
