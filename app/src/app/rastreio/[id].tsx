import type { EventoRastreio } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { envioApi } from '@/api/envio';
import { Screen } from '@/components/Screen';
import { ROTULO_STATUS, StatusPedidoTag } from '@/components/StatusPedidoTag';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** As etapas por onde o pedido passa, na ordem — vira a linha do tempo. */
const ETAPAS = ['PAGO', 'EM_PRODUCAO', 'ENVIADO', 'CONCLUIDO'] as const;

function dataHora(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function RastreioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [copiado, setCopiado] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['rastreio', id],
    queryFn: () => envioApi.rastreio(id),
    enabled: !!id,
  });

  async function copiarCodigo(codigo: string) {
    await Clipboard.setStringAsync(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (isLoading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen style={styles.centered}>
        <ThemedText themeColor="textSecondary">Pedido não encontrado.</ThemedText>
      </Screen>
    );
  }

  const { rastreio } = data;
  const eventos = rastreio.eventos as EventoRastreio[];
  const cancelado = rastreio.status === 'CANCELADO';
  const etapaAtual = ETAPAS.indexOf(rastreio.status as (typeof ETAPAS)[number]);

  return (
    <Screen maxWidth={640} style={styles.screen}>
      <View style={[styles.resumo, { backgroundColor: theme.backgroundElement }]}>
        <StatusPedidoTag status={rastreio.status} />
        {rastreio.transportadora ? (
          <ThemedText type="small" themeColor="textSecondary">
            {rastreio.transportadora} {rastreio.servico}
            {rastreio.prazoDias ? ` · até ${rastreio.prazoDias} dias úteis` : ''}
          </ThemedText>
        ) : null}
      </View>

      {rastreio.codigoRastreio ? (
        <View style={styles.grupo}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.grupoTitulo}>
            Código de rastreio
          </ThemedText>
          <Pressable
            onPress={() => copiarCodigo(rastreio.codigoRastreio as string)}
            style={({ pressed }) => [
              styles.codigo,
              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText type="smallBold" style={styles.codigoTexto}>
              {rastreio.codigoRastreio}
            </ThemedText>
            <Ionicons name={copiado ? 'checkmark' : 'copy-outline'} size={18} color={theme.primary} />
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary">
            {copiado ? 'Copiado!' : 'Toque para copiar e acompanhar no site da transportadora.'}
          </ThemedText>
        </View>
      ) : null}

      {/* Linha do tempo simples, pelo status do pedido */}
      {!cancelado ? (
        <View style={styles.grupo}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.grupoTitulo}>
            Andamento
          </ThemedText>
          <View style={[styles.etapas, { backgroundColor: theme.backgroundElement }]}>
            {ETAPAS.map((etapa, i) => {
              const passou = etapaAtual >= i;
              return (
                <Fragment key={etapa}>
                  {i > 0 ? (
                    <View
                      style={[
                        styles.conector,
                        { backgroundColor: etapaAtual >= i ? theme.primary : theme.border },
                      ]}
                    />
                  ) : null}
                  <View style={styles.etapa}>
                    <View
                      style={[
                        styles.bolinha,
                        {
                          backgroundColor: passou ? theme.primary : theme.background,
                          borderColor: passou ? theme.primary : theme.border,
                        },
                      ]}>
                      {passou ? <Ionicons name="checkmark" size={12} color={theme.primaryText} /> : null}
                    </View>
                    <ThemedText type="small" themeColor={passou ? 'text' : 'textSecondary'}>
                      {ROTULO_STATUS[etapa]}
                    </ThemedText>
                  </View>
                </Fragment>
              );
            })}
          </View>
        </View>
      ) : null}

      {/* Eventos vindos da transportadora, quando a etiqueta saiu por aqui */}
      {eventos.length ? (
        <View style={styles.grupo}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.grupoTitulo}>
            Histórico da transportadora
          </ThemedText>
          <View style={[styles.historico, { backgroundColor: theme.backgroundElement }]}>
            {eventos.map((evento, i) => (
              <View key={i} style={styles.evento}>
                <View style={[styles.eventoPonto, { backgroundColor: theme.primary }]} />
                <View style={styles.eventoTexto}>
                  <ThemedText type="small">{evento.description ?? evento.status}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {[dataHora(evento.created_at), evento.location].filter(Boolean).join(' · ')}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : rastreio.codigoRastreio ? null : (
        <View style={[styles.aviso, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="cube-outline" size={28} color={theme.textSecondary} />
          <ThemedText type="smallBold">Ainda sem código de rastreio</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
            Assim que seu pedido for despachado, o código aparece aqui.
          </ThemedText>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralizado: {
    textAlign: 'center',
  },
  resumo: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  grupo: {
    gap: Spacing.two,
  },
  grupoTitulo: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  codigo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  codigoTexto: {
    flex: 1,
    letterSpacing: 1,
  },
  etapas: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  etapa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  bolinha: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conector: {
    width: 2,
    height: 20,
    marginLeft: 10,
  },
  historico: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.three,
  },
  evento: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  eventoPonto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  eventoTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  aviso: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radius.medium,
  },
});
