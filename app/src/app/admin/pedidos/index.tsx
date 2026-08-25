import type { Pedido, StatusPagamentoPedido, StatusProducao } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { envioApi, urlDeDownload } from '@/api/envio';
import { Button } from '@/components/Button';
import { Screen, useMostrarBarraDeRolagem } from '@/components/Screen';
import { ROTULO_PAGAMENTO, ROTULO_PRODUCAO, TagPagamento, TagProducao } from '@/components/StatusPedidoTag';
import { TextField } from '@/components/TextField';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAdminPedidos, useAtualizarStatusPedido } from '@/hooks/usePedidos';
import { useTheme } from '@/hooks/use-theme';

const PAGAMENTOS: StatusPagamentoPedido[] = ['AGUARDANDO', 'PAGO', 'CANCELADO'];
const PRODUCOES: StatusProducao[] = ['AGUARDANDO', 'EM_PRODUCAO', 'ENVIADO', 'ENTREGUE'];

/** Um filtro aponta pra um eixo só — nunca cruza pagamento com produção. */
type FiltroStatus =
  | { eixo: 'pagamento'; valor: StatusPagamentoPedido }
  | { eixo: 'producao'; valor: StatusProducao };

/**
 * Uma lista só, com os status dos dois eixos enfileirados. Escolher um troca o
 * anterior: o admin filtra por "Pago" OU por "Em produção", nunca pelos dois
 * ao mesmo tempo.
 */
const FILTROS: { chave: string; rotulo: string; filtro: FiltroStatus }[] = [
  ...PAGAMENTOS.map((valor) => ({
    chave: `pagamento-${valor}`,
    rotulo: ROTULO_PAGAMENTO[valor],
    filtro: { eixo: 'pagamento' as const, valor },
  })),
  ...PRODUCOES.map((valor) => ({
    chave: `producao-${valor}`,
    rotulo: ROTULO_PRODUCAO[valor],
    filtro: { eixo: 'producao' as const, valor },
  })),
];

/** Busca sem acento: "producao" acha "produção", "helloween" acha "Helloween". */
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function moeda(valor: string | number) {
  const [inteiro, centavos] = (Number(valor) || 0).toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Busca({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const theme = useTheme();

  return (
    <View style={[styles.busca, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <Ionicons name="search" size={18} color={theme.textSecondary} />
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder="Buscar por cliente, produto ou código"
        placeholderTextColor={theme.textSecondary}
        style={[styles.buscaInput, { color: theme.text, fontFamily: Fonts.sans }]}
        autoCorrect={false}
      />
      {valor ? (
        <Pressable onPress={() => onChange('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Chip({ texto, ativo, onPress }: { texto: string; ativo: boolean; onPress: () => void }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: ativo ? theme.primary : theme.backgroundElement,
          borderColor: ativo ? theme.primary : theme.border,
        },
      ]}>
      <ThemedText type="small" themeColor={ativo ? 'primaryText' : 'text'}>
        {texto}
      </ThemedText>
    </Pressable>
  );
}

export default function AdminPedidosScreen() {
  const { data, isLoading, refetch: recarregar } = useAdminPedidos();
  const atualizar = useAtualizarStatusPedido();
  const [aberto, setAberto] = useState<Pedido | null>(null);
  const [error, setError] = useState<string>();
  const [codigoRastreio, setCodigoRastreio] = useState('');
  const [gerandoEtiqueta, setGerandoEtiqueta] = useState(false);
  const [salvandoRastreio, setSalvandoRastreio] = useState(false);
  const [termo, setTermo] = useState('');
  const [chaveFiltro, setChaveFiltro] = useState<string | null>(null);
  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();

  const todos = data?.items ?? [];
  const filtro = FILTROS.find((f) => f.chave === chaveFiltro)?.filtro ?? null;
  const busca = normalizar(termo.trim());

  const pedidos = useMemo(
    () =>
      todos.filter((p) => {
        // O status escolhido vale pro eixo dele e só — o outro eixo não entra
        // na conta, pra "Pago" não esconder o que está em produção.
        if (filtro) {
          const bate =
            filtro.eixo === 'pagamento'
              ? p.statusPagamento === filtro.valor
              : p.statusProducao === filtro.valor;
          if (!bate) return false;
        }

        if (!busca) return true;
        const campos = [
          p.usuario.nome,
          p.usuario.email,
          // Os 8 primeiros caracteres são o que o admin vê como "código".
          p.id.slice(0, 8),
          p.codigoRastreio ?? '',
          ...p.itens.map((i) => i.produto?.nome ?? ''),
        ];
        return campos.some((campo) => normalizar(campo).includes(busca));
      }),
    [todos, filtro, busca],
  );

  const filtrando = chaveFiltro !== null || busca.length > 0;

  async function handleGerarEtiqueta() {
    if (!aberto) return;
    setError(undefined);
    setGerandoEtiqueta(true);
    try {
      const { pedido } = await envioApi.gerarEtiqueta(aberto.id);
      setAberto(pedido);
      await recarregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel gerar a etiqueta');
    } finally {
      setGerandoEtiqueta(false);
    }
  }

  async function handleSalvarRastreio() {
    if (!aberto || !codigoRastreio.trim()) return;
    setError(undefined);
    setSalvandoRastreio(true);
    try {
      const { pedido } = await envioApi.definirRastreio(aberto.id, codigoRastreio.trim());
      setAberto(pedido);
      setCodigoRastreio('');
      await recarregar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel salvar o codigo');
    } finally {
      setSalvandoRastreio(false);
    }
  }

  /** Muda um eixo só; o outro fica onde está. */
  async function handleStatus(mudanca: {
    statusPagamento?: StatusPagamentoPedido;
    statusProducao?: StatusProducao;
  }) {
    if (!aberto) return;
    setError(undefined);
    try {
      const { pedido } = await atualizar.mutateAsync({ id: aberto.id, ...mudanca });
      // Fica aberto: quem muda o pagamento normalmente mexe na produção logo em
      // seguida, e fechar a cada toque obrigaria a reabrir o pedido.
      setAberto(pedido);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível mudar o status');
    }
  }

  if (isLoading) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} maxWidth={900} style={styles.screen}>
      {todos.length ? (
        <View style={[styles.filtros, { borderColor: theme.border }]}>
          <Busca valor={termo} onChange={setTermo} />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip texto="Todos" ativo={chaveFiltro === null} onPress={() => setChaveFiltro(null)} />
            {FILTROS.map((opcao) => (
              <Chip
                key={opcao.chave}
                texto={opcao.rotulo}
                ativo={chaveFiltro === opcao.chave}
                // Tocar de novo no que já está ativo desliga o filtro — é o que
                // a mão espera, e evita ter que voltar no "Todos".
                onPress={() => setChaveFiltro(chaveFiltro === opcao.chave ? null : opcao.chave)}
              />
            ))}
          </ScrollView>

          {filtrando ? (
            <View style={styles.resultado}>
              <ThemedText type="small" themeColor="textSecondary">
                {pedidos.length} de {todos.length} {todos.length === 1 ? 'pedido' : 'pedidos'}
              </ThemedText>
              <Pressable
                onPress={() => {
                  setChaveFiltro(null);
                  setTermo('');
                }}
                hitSlop={8}>
                <ThemedText type="small" themeColor="primary">
                  Limpar
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      {todos.length && pedidos.length ? (
        <FlatList
          showsVerticalScrollIndicator={mostrarBarra}
          data={pedidos}
          keyExtractor={(item) => item.id}
          style={styles.lista}
          contentContainerStyle={styles.listaConteudo}
          renderItem={({ item }) => {
            // Capa = foto do primeiro item que tiver imagem.
            const capa = item.itens.find((i) => i.produto?.imagemUrl)?.produto?.imagemUrl;
            const extras = item.itens.length - 1;

            return (
              <Pressable
                onPress={() => setAberto(item)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}>
                <View style={styles.cardTopo}>
                  <View>
                    {capa ? (
                      <Image source={{ uri: capa }} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, { backgroundColor: theme.secondary }]} />
                    )}
                    {/* Pedido com mais de um produto: marca quantos ficaram de fora da capa. */}
                    {extras > 0 ? (
                      <View style={[styles.contador, { backgroundColor: theme.primary }]}>
                        <ThemedText type="small" themeColor="primaryText" style={styles.contadorTexto}>
                          +{extras}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardTexto}>
                    <ThemedText type="smallBold">{moeda(item.total)}</ThemedText>
                    <ThemedText type="small" numberOfLines={1}>
                      {item.itens[0]?.produto?.nome ?? 'Produto removido'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {item.usuario.nome} · {dataHora(item.createdAt)}
                    </ThemedText>
                    {/* As duas etiquetas juntas, quebrando linha quando a tela
                        for estreita — cada pedido tem os dois status. */}
                    <View style={styles.tags}>
                      <TagPagamento status={item.statusPagamento} />
                      <TagProducao status={item.statusProducao} />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={styles.centered}>
          <Ionicons
            name={todos.length ? 'filter-outline' : 'receipt-outline'}
            size={40}
            color={theme.textSecondary}
          />
          <ThemedText type="smallBold">
            {todos.length ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centralizado}>
            {todos.length
              ? 'Tente outra busca ou outro status — ou toque em Limpar pra ver todos.'
              : 'Os pedidos dos clientes aparecem aqui assim que forem feitos.'}
          </ThemedText>
        </View>
      )}

      <Modal visible={!!aberto} animationType="slide" transparent onRequestClose={() => setAberto(null)}>
        <Pressable style={styles.backdrop} onPress={() => setAberto(null)} />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={styles.sheetTopo}>
            <ThemedText type="subtitle">Pedido</ThemedText>
            <Pressable onPress={() => setAberto(null)} hitSlop={8}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.sheetConteudo}>
            {aberto ? (
              <>
                <View style={styles.tags}>
                  <TagPagamento status={aberto.statusPagamento} />
                  <TagProducao status={aberto.statusProducao} />
                </View>

                <View style={styles.bloco}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Cliente
                  </ThemedText>
                  <ThemedText type="smallBold">{aberto.usuario.nome}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {aberto.usuario.email}
                  </ThemedText>
                </View>

                <View style={styles.bloco}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Itens
                  </ThemedText>
                  {aberto.itens.map((item) => (
                    <View key={item.id} style={styles.itemComFoto}>
                      {item.geracaoImagem?.imagemUrl || item.produto?.imagemUrl ? (
                        <Image
                          source={{ uri: item.geracaoImagem?.imagemUrl ?? (item.produto?.imagemUrl as string) }}
                          style={styles.itemThumb}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={[styles.itemThumb, { backgroundColor: theme.secondary }]} />
                      )}
                      <View style={styles.itemNome}>
                        <ThemedText type="small" numberOfLines={2}>
                          {item.quantidade}x {item.produto?.nome ?? 'Produto removido'}
                        </ThemedText>
                        {item.geracaoImagem ? (
                          <ThemedText type="small" themeColor="primary" numberOfLines={1}>
                            Arte personalizada: {item.geracaoImagem.tema}
                          </ThemedText>
                        ) : null}
                      </View>
                      <ThemedText type="small" themeColor="textSecondary">
                        {moeda(Number(item.precoUnitario) * item.quantidade)}
                      </ThemedText>
                    </View>
                  ))}
                  {aberto.freteValor ? (
                    <View style={styles.itemLinha}>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.itemNome}>
                        Frete · {aberto.freteTransportadora} {aberto.freteServico}
                        {aberto.fretePrazoDias ? ` (${aberto.fretePrazoDias} dias úteis)` : ''}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {moeda(aberto.freteValor)}
                      </ThemedText>
                    </View>
                  ) : null}

                  <View style={[styles.itemLinha, styles.totalLinha, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">Total</ThemedText>
                    <ThemedText type="smallBold" themeColor="primary">
                      {moeda(aberto.total)}
                    </ThemedText>
                  </View>
                </View>

                {aberto.cepDestino ? (
                  <View style={styles.bloco}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Entrega
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {[aberto.enderecoLogradouro, aberto.enderecoNumero].filter(Boolean).join(', ')}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {[aberto.enderecoBairro, aberto.enderecoCidade].filter(Boolean).join(', ')}
                      {aberto.enderecoUf ? `/${aberto.enderecoUf}` : ''} · CEP {aberto.cepDestino}
                    </ThemedText>
                  </View>
                ) : null}

                {/* Baixar a arte de cada item — é o que vai pra produção. */}
                <View style={styles.bloco}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Arte para produzir
                  </ThemedText>
                  {aberto.itens.map((item) => {
                    const arte = item.geracaoImagem?.imagemUrl ?? item.produto?.imagemUrl;
                    if (!arte) return null;
                    const nome = `${item.produto?.nome ?? 'produto'}${
                      item.geracaoImagem ? `-${item.geracaoImagem.tema}` : ''
                    }`;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => Linking.openURL(urlDeDownload(arte, nome))}
                        style={({ pressed }) => [
                          styles.acaoLinha,
                          { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
                        ]}>
                        <Ionicons name="download-outline" size={18} color={theme.primary} />
                        <ThemedText type="small" themeColor="primary" numberOfLines={1} style={styles.itemNome}>
                          Baixar {item.geracaoImagem ? 'arte personalizada' : 'imagem'} ·{' '}
                          {item.produto?.nome ?? 'produto'}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Etiqueta e rastreio */}
                <View style={styles.bloco}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Envio
                  </ThemedText>

                  {aberto.codigoRastreio ? (
                    <ThemedText type="smallBold">Rastreio: {aberto.codigoRastreio}</ThemedText>
                  ) : null}

                  {aberto.urlEtiqueta ? (
                    <Pressable
                      onPress={() => Linking.openURL(aberto.urlEtiqueta as string)}
                      style={({ pressed }) => [
                        styles.acaoLinha,
                        { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
                      ]}>
                      <Ionicons name="document-text-outline" size={18} color={theme.primary} />
                      <ThemedText type="small" themeColor="primary">
                        Baixar etiqueta (PDF)
                      </ThemedText>
                    </Pressable>
                  ) : (
                    <Button
                      title="Gerar etiqueta no Melhor Envio"
                      variant="ghost"
                      loading={gerandoEtiqueta}
                      onPress={handleGerarEtiqueta}
                    />
                  )}

                  {/* Quem despacha por fora cola o código na mão. */}
                  <View style={styles.rastreioLinha}>
                    <View style={styles.rastreioCampo}>
                      <TextField
                        label="Ou cole o código de rastreio"
                        value={codigoRastreio}
                        onChangeText={setCodigoRastreio}
                        autoCapitalize="characters"
                        placeholder="AA123456789BR"
                      />
                    </View>
                    <Button title="Salvar" onPress={handleSalvarRastreio} loading={salvandoRastreio} />
                  </View>
                </View>

                <View style={styles.bloco}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Pagamento
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    O Mercado Pago marca como pago sozinho. Mexa aqui só pra
                    receber por fora ou cancelar.
                  </ThemedText>
                  <View style={styles.statusGrade}>
                    {PAGAMENTOS.map((status) => (
                      <Pressable
                        key={status}
                        onPress={() => handleStatus({ statusPagamento: status })}
                        disabled={atualizar.isPending}
                        style={[
                          styles.statusOpcao,
                          {
                            backgroundColor:
                              aberto.statusPagamento === status ? theme.primary : theme.backgroundElement,
                            borderColor:
                              aberto.statusPagamento === status ? theme.primary : theme.border,
                          },
                        ]}>
                        <ThemedText
                          type="small"
                          themeColor={aberto.statusPagamento === status ? 'primaryText' : 'text'}>
                          {ROTULO_PAGAMENTO[status]}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.bloco}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Produção e envio
                  </ThemedText>
                  <View style={styles.statusGrade}>
                    {PRODUCOES.map((status) => (
                      <Pressable
                        key={status}
                        onPress={() => handleStatus({ statusProducao: status })}
                        disabled={atualizar.isPending}
                        style={[
                          styles.statusOpcao,
                          {
                            backgroundColor:
                              aberto.statusProducao === status ? theme.primary : theme.backgroundElement,
                            borderColor:
                              aberto.statusProducao === status ? theme.primary : theme.border,
                          },
                        ]}>
                        <ThemedText
                          type="small"
                          themeColor={aberto.statusProducao === status ? 'primaryText' : 'text'}>
                          {ROTULO_PRODUCAO[status]}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {error ? (
                  <ThemedText type="small" themeColor="danger">
                    {error}
                  </ThemedText>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          <Button title="Fechar" variant="ghost" onPress={() => setAberto(null)} />
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  centralizado: {
    textAlign: 'center',
  },
  filtros: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
    marginBottom: Spacing.one,
    borderBottomWidth: 1,
  },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  buscaInput: {
    flex: 1,
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingRight: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  lista: {
    flex: 1,
  },
  listaConteudo: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  cardTopo: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  cardTexto: {
    flex: 1,
    gap: Spacing.half,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.half,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.small,
  },
  contador: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  contadorTexto: {
    fontSize: 11,
    lineHeight: 14,
  },
  acaoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  rastreioLinha: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  rastreioCampo: {
    flex: 1,
  },
  itemComFoto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  itemThumb: {
    width: 36,
    height: 36,
    borderRadius: Radius.small,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    maxHeight: '80%',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sheetTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetConteudo: {
    gap: Spacing.four,
  },
  bloco: {
    gap: Spacing.one,
  },
  itemLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  itemNome: {
    flex: 1,
  },
  totalLinha: {
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    marginTop: Spacing.one,
  },
  statusGrade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  statusOpcao: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
