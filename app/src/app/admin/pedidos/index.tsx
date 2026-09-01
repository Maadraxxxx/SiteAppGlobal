import type { Pedido, StatusPagamentoPedido, StatusProducao } from '@global-decora/shared';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
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
import { rotuloDoTema } from '@/lib/tema';
import { abrirEmNovaAba, baixarArquivo } from '@/lib/baixar';

const PAGAMENTOS: StatusPagamentoPedido[] = ['AGUARDANDO', 'PAGO', 'CANCELADO'];
const PRODUCOES: StatusProducao[] = ['AGUARDANDO', 'EM_PRODUCAO', 'ENVIADO', 'ENTREGUE'];

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

/** Célula vazia que fecha a última linha da grade — não desenha nada. */
interface Preenchimento {
  id: string;
  vazio: true;
}

/** Numa tela larga uma coluna só deixa metade do monitor vazia. */
function colunasPara(largura: number) {
  if (largura >= 1400) return 3;
  if (largura >= 900) return 2;
  return 1;
}

/**
 * Atalho do topo: mostra quantos pedidos estão em cada situação e, ao tocar,
 * filtra por ela. É o caminho mais curto entre "quanto tenho pra produzir" e a
 * lista desses pedidos.
 */
function Atalho({
  icone,
  rotulo,
  quantidade,
  valor,
  ativo,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  rotulo: string;
  quantidade: number;
  valor?: string;
  ativo: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.atalho,
        {
          backgroundColor: ativo ? theme.primary : theme.backgroundElement,
          borderColor: ativo ? theme.primary : 'transparent',
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      <Ionicons name={icone} size={16} color={ativo ? theme.primaryText : theme.primary} />
      <ThemedText type="subtitle" style={[styles.atalhoNumero, ativo ? { color: theme.primaryText } : null]}>
        {quantidade}
      </ThemedText>
      <ThemedText
        type="small"
        themeColor={ativo ? 'primaryText' : 'textSecondary'}
        numberOfLines={1}>
        {rotulo}
      </ThemedText>
      {valor ? (
        <ThemedText type="small" themeColor={ativo ? 'primaryText' : 'text'} numberOfLines={1}>
          {valor}
        </ThemedText>
      ) : null}
    </Pressable>
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

/**
 * Um eixo por linha, cada um com a própria escolha. Os dois se somam: dá pra
 * pedir "Pago" e "Na fila" ao mesmo tempo, que é a fila de produção do dia.
 */
function LinhaDeFiltro<T extends string>({
  titulo,
  opcoes,
  rotulo,
  selecionado,
  onSelecionar,
}: {
  titulo: string;
  opcoes: T[];
  rotulo: Record<T, string>;
  selecionado: T | null;
  onSelecionar: (valor: T | null) => void;
}) {
  return (
    <View style={styles.filtroLinha}>
      <ThemedText type="small" themeColor="textSecondary">
        {titulo}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip texto="Todos" ativo={selecionado === null} onPress={() => onSelecionar(null)} />
        {opcoes.map((opcao) => (
          <Chip
            key={opcao}
            texto={rotulo[opcao]}
            ativo={selecionado === opcao}
            // Tocar de novo no que já está ativo desliga só esse eixo — o outro
            // continua onde estava.
            onPress={() => onSelecionar(selecionado === opcao ? null : opcao)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function AdminPedidosScreen() {
  const { abrir } = useLocalSearchParams<{ abrir?: string }>();
  const { data, isLoading, refetch: recarregar } = useAdminPedidos();
  const atualizar = useAtualizarStatusPedido();
  const [aberto, setAberto] = useState<Pedido | null>(null);
  const [error, setError] = useState<string>();
  const [codigoRastreio, setCodigoRastreio] = useState('');
  const [gerandoEtiqueta, setGerandoEtiqueta] = useState(false);
  const [salvandoRastreio, setSalvandoRastreio] = useState(false);
  const [termo, setTermo] = useState('');
  // A tela abre já na fila de trabalho do dia — pago e ainda não produzido —
  // que é o que o admin vem ver na maioria das vezes. "Limpar" mostra todos.
  const [filtroPagamento, setFiltroPagamento] = useState<StatusPagamentoPedido | null>('PAGO');
  const [filtroProducao, setFiltroProducao] = useState<StatusProducao | null>('AGUARDANDO');
  const [ordem, setOrdem] = useState<'recentes' | 'valor'>('recentes');
  const theme = useTheme();
  const mostrarBarra = useMostrarBarraDeRolagem();
  const { width: janela } = useWindowDimensions();
  const colunas = colunasPara(janela);

  const todos = data?.items ?? [];
  const busca = normalizar(termo.trim());

  // Chegou pelo painel com um pedido escolhido: abre a ficha dele assim que a
  // lista carregar, em vez de largar o admin procurando na grade. O ref marca
  // que aquele id já foi atendido — senão, qualquer recarga da lista depois
  // (mudar um status, por exemplo) reabriria a ficha que o admin fechou.
  const jaAbriu = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!abrir || jaAbriu.current === abrir) return;
    const alvo = todos.find((p) => p.id === abrir);
    if (!alvo) return;
    jaAbriu.current = abrir;
    setAberto(alvo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrir, todos.length]);

  // Contas do topo. Saem da lista já carregada — não vale uma ida ao servidor
  // pra somar o que está aqui na mão.
  const resumo = useMemo(() => {
    const soma = (lista: typeof todos) => lista.reduce((s, p) => s + Number(p.total), 0);
    const aguardando = todos.filter((p) => p.statusPagamento === 'AGUARDANDO');
    const pagos = todos.filter((p) => p.statusPagamento === 'PAGO');
    return {
      aguardando: { quantidade: aguardando.length, valor: soma(aguardando) },
      pagos: { quantidade: pagos.length, valor: soma(pagos) },
      naFila: todos.filter((p) => p.statusPagamento === 'PAGO' && p.statusProducao === 'AGUARDANDO').length,
      emProducao: todos.filter((p) => p.statusProducao === 'EM_PRODUCAO').length,
      enviados: todos.filter((p) => p.statusProducao === 'ENVIADO').length,
    };
  }, [todos]);

  const pedidos = useMemo(
    () =>
      todos.filter((p) => {
        // Cada eixo filtra por conta própria, e os dois se somam: escolher
        // "Pago" e "Na fila" junto dá exatamente o que está pago esperando
        // entrar na produção.
        if (filtroPagamento && p.statusPagamento !== filtroPagamento) return false;
        if (filtroProducao && p.statusProducao !== filtroProducao) return false;

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
    [todos, filtroPagamento, filtroProducao, busca],
  );

  const ordenados = useMemo(() => {
    // Cópia antes de ordenar: sort mexe no array original, e o original aqui é
    // o cache do React Query.
    const lista = [...pedidos];
    if (ordem === 'valor') return lista.sort((a, b) => Number(b.total) - Number(a.total));
    return lista.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [pedidos, ordem]);

  /**
   * Os cartões são `flex: 1` pra dividir a linha igualmente, e por isso o
   * último sozinho na última linha esticava pela largura toda. Completar a
   * linha com vazios resolve sem precisar calcular largura em pixel — que
   * erraria pela grossura da barra de rolagem.
   */
  const emGrade = useMemo(() => {
    const sobra = colunas > 1 ? ordenados.length % colunas : 0;
    if (!sobra) return ordenados as (Pedido | Preenchimento)[];
    const vazios: Preenchimento[] = Array.from({ length: colunas - sobra }, (_, i) => ({
      id: `vazio-${i}`,
      vazio: true,
    }));
    return [...ordenados, ...vazios];
  }, [ordenados, colunas]);

  const filtrando = filtroPagamento !== null || filtroProducao !== null || busca.length > 0;

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
    <Screen scroll={false} maxWidth={1400} style={styles.screen}>
      {todos.length ? (
        <View style={[styles.filtros, { borderColor: theme.border }]}>
          {/* Panorama antes da lista: quantos pedidos em cada situação, e um
              toque leva direto pra eles. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.atalhos}>
            <Atalho
              icone="hourglass-outline"
              rotulo="Aguardando"
              quantidade={resumo.aguardando.quantidade}
              valor={moeda(resumo.aguardando.valor)}
              ativo={filtroPagamento === 'AGUARDANDO'}
              onPress={() => {
                setFiltroPagamento(filtroPagamento === 'AGUARDANDO' ? null : 'AGUARDANDO');
                setFiltroProducao(null);
              }}
            />
            <Atalho
              icone="checkmark-circle-outline"
              rotulo="Pagos"
              quantidade={resumo.pagos.quantidade}
              valor={moeda(resumo.pagos.valor)}
              ativo={filtroPagamento === 'PAGO' && filtroProducao === null}
              onPress={() => {
                setFiltroPagamento(filtroPagamento === 'PAGO' && !filtroProducao ? null : 'PAGO');
                setFiltroProducao(null);
              }}
            />
            {/* Pago e ainda não produzido: é a fila de trabalho do dia. */}
            <Atalho
              icone="layers-outline"
              rotulo="Na fila"
              quantidade={resumo.naFila}
              ativo={filtroPagamento === 'PAGO' && filtroProducao === 'AGUARDANDO'}
              onPress={() => {
                const jaEstava = filtroPagamento === 'PAGO' && filtroProducao === 'AGUARDANDO';
                setFiltroPagamento(jaEstava ? null : 'PAGO');
                setFiltroProducao(jaEstava ? null : 'AGUARDANDO');
              }}
            />
            <Atalho
              icone="construct-outline"
              rotulo="Em produção"
              quantidade={resumo.emProducao}
              ativo={filtroProducao === 'EM_PRODUCAO'}
              onPress={() => {
                setFiltroProducao(filtroProducao === 'EM_PRODUCAO' ? null : 'EM_PRODUCAO');
                setFiltroPagamento(null);
              }}
            />
            <Atalho
              icone="paper-plane-outline"
              rotulo="Enviados"
              quantidade={resumo.enviados}
              ativo={filtroProducao === 'ENVIADO'}
              onPress={() => {
                setFiltroProducao(filtroProducao === 'ENVIADO' ? null : 'ENVIADO');
                setFiltroPagamento(null);
              }}
            />
          </ScrollView>

          <Busca valor={termo} onChange={setTermo} />

          <LinhaDeFiltro
            titulo="Pagamento"
            opcoes={PAGAMENTOS}
            rotulo={ROTULO_PAGAMENTO}
            selecionado={filtroPagamento}
            onSelecionar={setFiltroPagamento}
          />
          <LinhaDeFiltro
            titulo="Produção e entrega"
            opcoes={PRODUCOES}
            rotulo={ROTULO_PRODUCAO}
            selecionado={filtroProducao}
            onSelecionar={setFiltroProducao}
          />

          <View style={styles.resultado}>
            <ThemedText type="small" themeColor="textSecondary">
              {filtrando
                ? `${pedidos.length} de ${todos.length} ${todos.length === 1 ? 'pedido' : 'pedidos'}`
                : `${todos.length} ${todos.length === 1 ? 'pedido' : 'pedidos'}`}
            </ThemedText>

            <View style={styles.ordenacao}>
              <Chip
                texto="Mais recentes"
                ativo={ordem === 'recentes'}
                onPress={() => setOrdem('recentes')}
              />
              <Chip texto="Maior valor" ativo={ordem === 'valor'} onPress={() => setOrdem('valor')} />
              {filtrando ? (
                <Pressable
                  onPress={() => {
                    setFiltroPagamento(null);
                    setFiltroProducao(null);
                    setTermo('');
                  }}
                  hitSlop={8}
                  style={styles.limpar}>
                  <ThemedText type="small" themeColor="primary">
                    Limpar
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}

      {todos.length && pedidos.length ? (
        <FlatList
          // O FlatList não aceita trocar numColumns em voo: mudar a key força a
          // remontagem quando a janela muda de faixa.
          key={colunas}
          numColumns={colunas}
          columnWrapperStyle={colunas > 1 ? styles.coluna : undefined}
          showsVerticalScrollIndicator={mostrarBarra}
          data={emGrade}
          keyExtractor={(item) => item.id}
          style={styles.lista}
          contentContainerStyle={styles.listaConteudo}
          renderItem={({ item }) => {
            if ('vazio' in item) return <View style={styles.preenchimento} />;

            // Capa = foto do primeiro item que tiver imagem.
            // Mesma regra da lista do cliente: a arte encomendada vem antes da
            // foto do produto original. Sem isso a miniatura contradiria a
            // etiqueta de "arte personalizada" logo abaixo.
            const capa =
              item.itens.find((i) => i.geracaoImagem?.imagemUrl)?.geracaoImagem?.imagemUrl ??
              item.itens.find((i) => i.produto?.imagemUrl)?.produto?.imagemUrl;
            const extras = item.itens.length - 1;
            const pecas = item.itens.reduce((s, i) => s + i.quantidade, 0);
            const personalizados = item.itens
              .map((i) => i.geracaoImagem?.tema)
              .filter((tema): tema is string => !!tema);

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
                    <View style={styles.cardLinha}>
                      <ThemedText type="smallBold">{moeda(item.total)}</ThemedText>
                      {/* O código é o que o cliente cita quando escreve, e era
                          o único jeito de achar o pedido pela busca. */}
                      <ThemedText type="small" themeColor="textSecondary">
                        #{item.id.slice(0, 8)}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" numberOfLines={1}>
                      {item.itens[0]?.produto?.nome ?? 'Produto removido'}
                      {pecas > 1 ? ` · ${pecas} peças` : ''}
                    </ThemedText>
                    {/* Pedido com arte de IA da trabalho diferente na bancada:
                        precisa aparecer antes de abrir o pedido. Mostra o tema
                        quando ha um so; com varios, so a contagem. */}
                    {personalizados.length ? (
                      <ThemedText type="small" themeColor="primary" numberOfLines={1}>
                        {personalizados.length === 1
                          ? `Arte personalizada: ${rotuloDoTema(personalizados[0])}`
                          : `${personalizados.length} artes personalizadas`}
                      </ThemedText>
                    ) : null}
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {item.usuario.nome} · {dataHora(item.createdAt)}
                    </ThemedText>
                    {/* As duas etiquetas juntas, quebrando linha quando a tela
                        for estreita — cada pedido tem os dois status. */}
                    <View style={styles.tags}>
                      <TagPagamento status={item.statusPagamento} />
                      <TagProducao status={item.statusProducao} />
                      {item.codigoRastreio ? (
                        <View style={styles.rastreioMarca}>
                          <Ionicons name="location-outline" size={12} color={theme.textSecondary} />
                          <ThemedText type="small" themeColor="textSecondary">
                            rastreio
                          </ThemedText>
                        </View>
                      ) : null}
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
                            Arte personalizada: {rotuloDoTema(item.geracaoImagem.tema)}
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
                        onPress={() => baixarArquivo(urlDeDownload(arte, nome), nome)}
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
                      onPress={() => abrirEmNovaAba(aberto.urlEtiqueta as string)}
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
  filtroLinha: {
    gap: Spacing.one,
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
  atalhos: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingRight: Spacing.two,
  },
  atalho: {
    minWidth: 132,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    gap: Spacing.half,
  },
  atalhoNumero: {
    fontSize: 22,
    lineHeight: 28,
  },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  ordenacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  limpar: {
    paddingHorizontal: Spacing.two,
  },
  coluna: {
    gap: Spacing.two,
  },
  preenchimento: {
    flex: 1,
  },
  cardLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rastreioMarca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
  },
  lista: {
    flex: 1,
  },
  listaConteudo: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  card: {
    // Sem isto, na grade de 2 ou 3 colunas o cartão encolhe até o conteúdo em
    // vez de ocupar a coluna inteira.
    flex: 1,
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
