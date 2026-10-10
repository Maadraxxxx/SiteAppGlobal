import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/hooks/use-theme';
import { confirmacaoEscrita } from '@/lib/confirmacao';
import { ROTAS } from '@/lib/rotas';

/** O que a pessoa precisa escrever pra liberar o botão. */
const PALAVRA = 'Excluir';

function Linha({ icone, cor, children }: { icone: keyof typeof Ionicons.glyphMap; cor: string; children: ReactNode }) {
  return (
    <View style={styles.linha}>
      <Ionicons name={icone} size={16} color={cor} style={styles.linhaIcone} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.linhaTexto}>
        {children}
      </ThemedText>
    </View>
  );
}

/**
 * Exclusão de conta pelo próprio cliente — a App Store exige que todo app com
 * cadastro ofereça isso dentro do app, sem mandar a pessoa pra um site ou
 * pedir que escreva pro suporte.
 *
 * A tela existe pra uma coisa: que ninguém apague a conta sem saber o que
 * some e o que fica. Por isso lista os dois antes do botão, e o botão só
 * libera depois de a pessoa escrever a palavra.
 */
export default function ExcluirContaScreen() {
  const { usuario, isLoading, excluirConta } = useAuth();
  const { clear: esvaziarCarrinho } = useCart();
  const theme = useTheme();

  const [escrito, setEscrito] = useState('');
  const [excluindo, setExcluindo] = useState(false);
  const [error, setError] = useState<string>();
  // Vem antes do teste de "está logado": assim que a exclusão termina o
  // usuário some do contexto, e sem isto a tela trocaria a confirmação pelo
  // aviso de "entre na sua conta".
  const [concluida, setConcluida] = useState(false);

  const liberado = confirmacaoEscrita(escrito, PALAVRA);

  async function handleExcluir() {
    if (!liberado || excluindo) return;
    setError(undefined);
    setExcluindo(true);
    try {
      await excluirConta();
      // O carrinho fica no aparelho e pode ter arte personalizada que acabou
      // de ser apagada no servidor — fechar um pedido com ela daria erro.
      await esvaziarCarrinho();
      setConcluida(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir a conta. Tente de novo.');
    } finally {
      setExcluindo(false);
    }
  }

  if (concluida) {
    return (
      <Screen maxWidth={520} style={styles.centro}>
        <View style={[styles.selo, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="checkmark" size={30} color={theme.success} />
        </View>
        <ThemedText type="subtitle" style={styles.centralizado}>
          Conta excluída
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
          Seus dados pessoais foram apagados. Se quiser voltar um dia, é só criar uma conta nova.
        </ThemedText>
        <View style={styles.acaoFinal}>
          <Button title="Voltar para a loja" onPress={() => router.replace('/(tabs)')} />
        </View>
      </Screen>
    );
  }

  if (isLoading) return null;

  if (!usuario) {
    return (
      <Screen maxWidth={520} style={styles.centro}>
        <ThemedText type="smallBold" style={styles.centralizado}>
          Entre na sua conta para excluí-la
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
          A exclusão é feita por quem está logado na conta, para que ninguém a apague no seu lugar.
        </ThemedText>
        <View style={styles.acaoFinal}>
          <Button title="Entrar" onPress={() => router.push('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen maxWidth={520} style={styles.tela}>
      <View style={[styles.aviso, { borderColor: theme.danger }]}>
        <Ionicons name="warning-outline" size={20} color={theme.danger} />
        <View style={styles.avisoTexto}>
          <ThemedText type="smallBold" themeColor="danger">
            Esta ação não tem volta
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            A conta de {usuario.email} será apagada agora, e não há como recuperá-la depois.
          </ThemedText>
        </View>
      </View>

      <View style={[styles.cartao, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">O que será apagado</ThemedText>
        <Linha icone="close-circle" cor={theme.danger}>
          Seu nome, e-mail e senha
        </Linha>
        <Linha icone="close-circle" cor={theme.danger}>
          Seus endereços e o CPF ou CNPJ informado
        </Linha>
        <Linha icone="close-circle" cor={theme.danger}>
          Suas conversas com o suporte
        </Linha>
        <Linha icone="close-circle" cor={theme.danger}>
          As artes criadas com IA que não viraram pedido
        </Linha>
        <Linha icone="close-circle" cor={theme.danger}>
          Os pedidos que não foram pagos
        </Linha>
      </View>

      <View style={[styles.cartao, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">O que continua guardado</ThemedText>
        <Linha icone="document-text-outline" cor={theme.textSecondary}>
          Os pedidos que você já pagou — itens, valores e endereço de entrega — ficam no registro de
          vendas da loja pelo prazo que a lei exige, sem ligação com o seu nome ou e-mail.
        </Linha>
        <Linha icone="eye-off-outline" cor={theme.textSecondary}>
          Você deixa de ver seus pedidos e o rastreio pelo app, inclusive de encomendas que ainda
          estão a caminho.
        </Linha>
        <Link href={ROTAS.privacidade} style={styles.link}>
          <ThemedText type="small" themeColor="primary">
            Ler a Política de Privacidade
          </ThemedText>
        </Link>
      </View>

      <TextField
        label={`Para confirmar, escreva ${PALAVRA}`}
        value={escrito}
        onChangeText={setEscrito}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={PALAVRA}
      />

      {error ? (
        <View style={[styles.erro, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        </View>
      ) : null}

      <Button
        title="Excluir minha conta definitivamente"
        variant="danger"
        onPress={handleExcluir}
        loading={excluindo}
        disabled={!liberado}
      />
      <Button title="Cancelar" variant="ghost" onPress={() => router.back()} disabled={excluindo} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: {
    gap: Spacing.three,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
  centralizado: {
    textAlign: 'center',
  },
  selo: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  acaoFinal: {
    width: '100%',
    marginTop: Spacing.three,
  },
  aviso: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  avisoTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  cartao: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  linha: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  linhaIcone: {
    // Desce o ícone até o meio da primeira linha do texto.
    marginTop: 2,
  },
  linhaTexto: {
    flex: 1,
  },
  link: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
  },
  erro: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
});
