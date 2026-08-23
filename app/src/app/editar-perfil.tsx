import { useState } from 'react';
import { Button } from '@/components/Button';
import { FormSection } from '@/components/FormSection';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { authApi } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';

export default function EditarPerfilScreen() {
  const { usuario, atualizarUsuario } = useAuth();

  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [dadosError, setDadosError] = useState<string>();
  const [dadosSucesso, setDadosSucesso] = useState(false);
  const [savingDados, setSavingDados] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [senhaError, setSenhaError] = useState<string>();
  const [senhaSucesso, setSenhaSucesso] = useState(false);
  const [savingSenha, setSavingSenha] = useState(false);

  async function handleSalvarDados() {
    if (!nome.trim() || !email.trim()) {
      setDadosError('Preencha nome e email.');
      return;
    }
    setDadosError(undefined);
    setDadosSucesso(false);
    setSavingDados(true);
    try {
      const { usuario: atualizado } = await authApi.updatePerfil(nome.trim(), email.trim());
      atualizarUsuario(atualizado);
      setDadosSucesso(true);
    } catch (err) {
      setDadosError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingDados(false);
    }
  }

  async function handleSalvarSenha() {
    if (!senhaAtual || novaSenha.length < 6) {
      setSenhaError('Informe a senha atual e uma nova senha com pelo menos 6 caracteres.');
      return;
    }
    setSenhaError(undefined);
    setSenhaSucesso(false);
    setSavingSenha(true);
    try {
      await authApi.updateSenha(senhaAtual, novaSenha);
      setSenhaAtual('');
      setNovaSenha('');
      setSenhaSucesso(true);
    } catch (err) {
      setSenhaError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingSenha(false);
    }
  }

  return (
    <Screen style={{ gap: Spacing.four }}>
      <ThemedText type="title">Editar perfil</ThemedText>

      <FormSection title="Dados da conta">
        <TextField label="Nome" value={nome} onChangeText={setNome} />
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        {dadosError ? (
          <ThemedText type="small" themeColor="danger">
            {dadosError}
          </ThemedText>
        ) : null}
        {dadosSucesso ? (
          <ThemedText type="small" themeColor="success">
            Dados atualizados!
          </ThemedText>
        ) : null}
        <Button title="Salvar dados" onPress={handleSalvarDados} loading={savingDados} />
      </FormSection>

      <FormSection title="Alterar senha">
        <TextField label="Senha atual" value={senhaAtual} onChangeText={setSenhaAtual} secureTextEntry />
        <TextField label="Nova senha" value={novaSenha} onChangeText={setNovaSenha} secureTextEntry />
        {senhaError ? (
          <ThemedText type="small" themeColor="danger">
            {senhaError}
          </ThemedText>
        ) : null}
        {senhaSucesso ? (
          <ThemedText type="small" themeColor="success">
            Senha alterada!
          </ThemedText>
        ) : null}
        <Button title="Alterar senha" onPress={handleSalvarSenha} loading={savingSenha} />
      </FormSection>
    </Screen>
  );
}
