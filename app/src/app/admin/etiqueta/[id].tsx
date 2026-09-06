import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { envioApi, type EtiquetaSimulada } from '@/api/envio';
import { imprimirHtml } from '@/lib/impressao';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * O HTML da impressão é montado à parte da tela.
 *
 * A tela é React Native e não vira papel; o expo-print imprime HTML. Manter os
 * dois separados evita a tentação de "printar a tela", que sairia com a barra
 * de navegação e o fundo do app no meio da etiqueta.
 */
function html(etiqueta: EtiquetaSimulada) {
  const itens = etiqueta.volumes
    .map((v) => `<li>${v.quantidade}x ${v.nome} — ${v.peso.toFixed(2)} kg</li>`)
    .join('');

  return `
<html><head><meta charset="utf-8" /><style>
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 24px; color: #000; }
  .etiqueta { border: 2px solid #000; padding: 16px; max-width: 520px; position: relative; }
  .marca { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
           font-size: 54px; font-weight: bold; color: rgba(214,57,43,.16); transform: rotate(-20deg);
           letter-spacing: 6px; pointer-events: none; }
  h1 { font-size: 15px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
  .bloco { border-top: 1px solid #000; padding: 10px 0; }
  .rotulo { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 4px; }
  .destaque { font-size: 17px; font-weight: bold; }
  ul { margin: 4px 0 0; padding-left: 18px; font-size: 12px; }
  .aviso { margin-top: 12px; font-size: 11px; color: #d6392b; font-weight: bold; }
</style></head><body>
  <div class="etiqueta">
    <div class="marca">SIMULADO</div>
    <h1>${etiqueta.servico || 'Envio'}</h1>
    <div class="destaque">${etiqueta.codigoRastreio ?? 'sem código'}</div>

    <div class="bloco">
      <div class="rotulo">Destinatário</div>
      <div class="destaque">${etiqueta.destinatario.nome}</div>
      <div>${etiqueta.destinatario.logradouro}${etiqueta.destinatario.complemento ? ' - ' + etiqueta.destinatario.complemento : ''}</div>
      <div>${etiqueta.destinatario.bairro}</div>
      <div>${etiqueta.destinatario.cidade} — CEP ${etiqueta.destinatario.cep}</div>
    </div>

    <div class="bloco">
      <div class="rotulo">Remetente</div>
      <div>${etiqueta.remetente.nome}</div>
      <div>${etiqueta.remetente.logradouro}</div>
      <div>${etiqueta.remetente.bairro}</div>
      <div>${etiqueta.remetente.cidade} — CEP ${etiqueta.remetente.cep}</div>
    </div>

    <div class="bloco">
      <div class="rotulo">Conteúdo — ${etiqueta.pesoTotal.toFixed(2)} kg</div>
      <ul>${itens}</ul>
    </div>

    <div class="bloco">
      <div class="rotulo">Pedido</div>
      <div>${etiqueta.referencia}</div>
    </div>

    <div class="aviso">
      Etiqueta simulada — não vale para postagem. Nenhuma transportadora aceita este documento.
    </div>
  </div>
</body></html>`.trim();
}

function Linha({ rotulo, children }: { rotulo: string; children: string }) {
  return (
    <View style={styles.linha}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.rotulo}>
        {rotulo}
      </ThemedText>
      <ThemedText type="small" style={styles.valor}>
        {children}
      </ThemedText>
    </View>
  );
}

export default function EtiquetaSimuladaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [erro, setErro] = useState<string>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['etiqueta-simulada', id],
    queryFn: () => envioApi.etiquetaSimulada(id),
    enabled: !!id,
    retry: false,
  });

  async function imprimir() {
    if (!data) return;
    setErro(undefined);
    try {
      await imprimirHtml(html(data.etiqueta));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não deu para abrir a impressão');
    }
  }

  if (isLoading) {
    return (
      <Screen style={styles.centro}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen style={styles.centro}>
        <Ionicons name="alert-circle-outline" size={40} color={theme.textSecondary} />
        <ThemedText type="smallBold" style={styles.centralizado}>
          {error instanceof Error ? error.message : 'Não foi possível montar a etiqueta'}
        </ThemedText>
      </Screen>
    );
  }

  const e = data.etiqueta;

  return (
    <Screen maxWidth={560} style={styles.tela}>
      <View style={[styles.selo, { borderColor: theme.danger }]}>
        <Ionicons name="warning-outline" size={16} color={theme.danger} />
        <ThemedText type="small" themeColor="danger" style={styles.seloTexto}>
          Etiqueta simulada — não vale para postagem.
        </ThemedText>
      </View>

      <View style={[styles.papel, { borderColor: theme.text }]}>
        <ThemedText type="smallBold">{e.servico || 'Envio'}</ThemedText>
        <ThemedText type="subtitle">{e.codigoRastreio ?? 'sem código'}</ThemedText>

        <View style={[styles.divisor, { backgroundColor: theme.border }]} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.secao}>
          DESTINATÁRIO
        </ThemedText>
        <ThemedText type="smallBold">{e.destinatario.nome}</ThemedText>
        <Linha rotulo="Endereço">
          {`${e.destinatario.logradouro}${e.destinatario.complemento ? ' - ' + e.destinatario.complemento : ''}`}
        </Linha>
        <Linha rotulo="Bairro">{e.destinatario.bairro}</Linha>
        <Linha rotulo="Cidade">{`${e.destinatario.cidade} — CEP ${e.destinatario.cep}`}</Linha>

        <View style={[styles.divisor, { backgroundColor: theme.border }]} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.secao}>
          REMETENTE
        </ThemedText>
        <Linha rotulo="Nome">{e.remetente.nome}</Linha>
        <Linha rotulo="Endereço">{e.remetente.logradouro || '(não configurado)'}</Linha>
        <Linha rotulo="Cidade">{`${e.remetente.cidade || '—'} — CEP ${e.remetente.cep || '—'}`}</Linha>

        <View style={[styles.divisor, { backgroundColor: theme.border }]} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.secao}>
          CONTEÚDO · {e.pesoTotal.toFixed(2)} KG
        </ThemedText>
        {e.volumes.map((v) => (
          <ThemedText key={v.nome} type="small">
            {v.quantidade}x {v.nome} — {v.peso.toFixed(2)} kg
          </ThemedText>
        ))}
      </View>

      <Button title="Imprimir" onPress={imprimir} />

      {erro ? (
        <ThemedText type="small" themeColor="danger">
          {erro}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tela: { gap: Spacing.three },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  centralizado: { textAlign: 'center' },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  seloTexto: { flex: 1 },
  papel: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Radius.small,
    borderWidth: 2,
  },
  divisor: { height: 1, marginVertical: Spacing.two },
  secao: { letterSpacing: 0.6 },
  linha: { flexDirection: 'row', gap: Spacing.two },
  rotulo: { width: 72 },
  valor: { flex: 1 },
});
