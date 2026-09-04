import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAbrirChamado } from '@/hooks/useChamados';
import { useMeusPedidos } from '@/hooks/usePedidos';
import { ROTAS } from '@/lib/rotas';
import { useTheme } from '@/hooks/use-theme';

function moeda(valor: string | number) {
  return `R$ ${(Number(valor) || 0).toFixed(2).replace('.', ',')}`;
}

export default function NovoChamadoScreen() {
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [pedidoId, setPedidoId] = useState<string>();
  const [erros, setErros] = useState<{ assunto?: string; mensagem?: string }>({});
  const [erro, setErro] = useState<string>();

  const abrir = useAbrirChamado();
  const pedidos = useMeusPedidos();
  const theme = useTheme();

  async function handleEnviar() {
    const novos: typeof erros = {};
    if (assunto.trim().length < 3) novos.assunto = 'Resuma o problema em poucas palavras';
    if (mensagem.trim().length < 10) novos.mensagem = 'Conte com um pouco mais de detalhe';

    setErros(novos);
    if (Object.keys(novos).length) return;

    setErro(undefined);
    try {
      const { chamado } = await abrir.mutateAsync({
        assunto: assunto.trim(),
        mensagem: mensagem.trim(),
        pedidoId,
      });
      // Substitui em vez de empilhar: voltar daqui tem que cair na lista, e
      // nao no formulario que a pessoa acabou de enviar.
      router.replace(ROTAS.chamado(chamado.id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não deu para abrir a solicitação');
    }
  }

  const meusPedidos = pedidos.data?.items ?? [];

  return (
    <Screen maxWidth={720} style={styles.tela}>
      <ThemedText type="small" themeColor="textSecondary">
        Conte o que aconteceu. A loja responde nesta mesma conversa.
      </ThemedText>

      <TextField
        label="Assunto"
        obrigatorio
        value={assunto}
        onChangeText={setAssunto}
        error={erros.assunto}
        placeholder="Ex: Painel chegou amassado"
      />

      <TextField
        label="O que aconteceu"
        obrigatorio
        value={mensagem}
        onChangeText={setMensagem}
        multiline
        error={erros.mensagem}
        hint="Quanto mais detalhe, menos idas e vindas."
        placeholder="Descreva o problema, o que você já tentou, o que espera que aconteça..."
      />

      {meusPedidos.length ? (
        <View style={styles.bloco}>
          <ThemedText type="smallBold">É sobre algum pedido?</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Opcional, mas ajuda a resolver mais rápido.
          </ThemedText>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pedidos}>
              {meusPedidos.slice(0, 10).map((pedido) => {
                const escolhido = pedidoId === pedido.id;

                return (
                  <Pressable
                    key={pedido.id}
                    // Tocar de novo desmarca: sem isso, escolher por engano
                    // vira uma escolha sem volta.
                    onPress={() => setPedidoId(escolhido ? undefined : pedido.id)}
                    style={[
                      styles.pedido,
                      {
                        backgroundColor: escolhido ? theme.primary : theme.backgroundElement,
                        borderColor: escolhido ? theme.primary : theme.border,
                      },
                    ]}>
                    <ThemedText type="small" themeColor={escolhido ? 'primaryText' : 'text'}>
                      #{pedido.id.slice(0, 8)}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor={escolhido ? 'primaryText' : 'textSecondary'}>
                      {moeda(pedido.total)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {erro ? (
        <View style={[styles.erro, { borderColor: theme.danger }]}>
          <Ionicons name="alert-circle" size={18} color={theme.danger} />
          <ThemedText type="small" themeColor="danger" style={styles.erroTexto}>
            {erro}
          </ThemedText>
        </View>
      ) : null}

      <Button title="Enviar solicitação" onPress={handleEnviar} loading={abrir.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: { gap: Spacing.three },
  bloco: { gap: Spacing.two },
  pedidos: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.one },
  pedido: {
    alignItems: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  erro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  erroTexto: { flex: 1 },
});
