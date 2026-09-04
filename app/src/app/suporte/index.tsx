import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { TagChamado } from '@/components/ConversaChamado';
import { Screen, useMostrarBarraDeRolagem } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useMeusChamados } from '@/hooks/useChamados';
import { ROTAS } from '@/lib/rotas';
import { useTheme } from '@/hooks/use-theme';

function data(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function SuporteScreen() {
  const { usuario } = useAuth();
  const { data: lista, isLoading } = useMeusChamados();
  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();

  const chamados = lista?.items ?? [];

  // Sem login a lista volta vazia por falta de permissao, e o "nenhuma
  // solicitacao" mentiria: o certo e pedir pra entrar, igual em Meus Pedidos.
  if (!usuario) {
    return (
      <Screen style={styles.centro}>
        <Ionicons name="chatbubbles-outline" size={40} color={theme.textSecondary} />
        <ThemedText type="smallBold">Entre para falar com a loja</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
          O atendimento fica ligado à sua conta, para você acompanhar as respostas.
        </ThemedText>
        <View style={styles.acao}>
          <Button title="Entrar" onPress={() => router.push('/(auth)/login')} />
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen style={styles.centro}>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} maxWidth={720} style={styles.tela}>
      <Button title="Abrir uma solicitação" onPress={() => router.push(ROTAS.suporteNovo)} />

      {chamados.length ? (
        <FlatList
          showsVerticalScrollIndicator={mostrarBarra}
          data={chamados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => {
            const ultima = item.mensagens[0];

            return (
              <Pressable
                onPress={() => router.push(ROTAS.chamado(item.id))}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}>
                <View style={styles.cardTopo}>
                  <ThemedText type="smallBold" numberOfLines={1} style={styles.assunto}>
                    {item.assunto}
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </View>

                <TagChamado status={item.status} />

                {ultima ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {ultima.autor === 'LOJA' ? 'Loja: ' : 'Você: '}
                    {ultima.texto}
                  </ThemedText>
                ) : null}

                <ThemedText type="small" themeColor="textSecondary">
                  {data(item.updatedAt)} · {item._count.mensagens}{' '}
                  {item._count.mensagens === 1 ? 'mensagem' : 'mensagens'}
                </ThemedText>
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={styles.vazio}>
          <View style={[styles.vazioIcone, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="chatbubbles-outline" size={28} color={theme.textSecondary} />
          </View>
          <ThemedText type="smallBold">Nenhuma solicitação por aqui</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
            Problema com um pedido, dúvida sobre um produto ou sobre a entrega: abra uma
            solicitação e a gente responde por aqui mesmo.
          </ThemedText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: { gap: Spacing.three },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  acao: { marginTop: Spacing.two, alignSelf: 'stretch', maxWidth: 280 },
  centralizado: { textAlign: 'center' },
  lista: { gap: Spacing.two, paddingBottom: Spacing.four },
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.medium },
  cardTopo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  assunto: { flex: 1 },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  vazioIcone: {
    width: 64,
    height: 64,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
});
