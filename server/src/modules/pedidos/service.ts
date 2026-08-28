import { Prisma, StatusPagamentoPedido, StatusProducao } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { badRequest, notFound } from '../../lib/http-error';
import { get as getEndereco } from '../enderecos/service';
import { precoDoServico } from '../frete/service';

// "Arrecadado" e dinheiro que de fato entrou. Agora e uma condicao so: o eixo
// do pagamento nao se mistura mais com a etapa da bancada.
const PAGO = { statusPagamento: StatusPagamentoPedido.PAGO };

const INCLUDE_PEDIDO = {
  itens: { include: { produto: true, geracaoImagem: true } },
  pagamentos: { orderBy: { createdAt: 'desc' } },
  usuario: { select: { id: true, nome: true, email: true } },
} satisfies Prisma.PedidoInclude;

/**
 * Ate quando o cliente ainda pode pagar. Sai calculado daqui, e nao fixo no
 * app, porque o prazo mora no env — se ele mudar, o app tem que acompanhar
 * sozinho. Nulo quando o pedido nao esta mais aguardando pagamento.
 */
function comPrazo<T extends { statusPagamento: StatusPagamentoPedido; createdAt: Date }>(pedido: T) {
  return {
    ...pedido,
    expiraEm:
      pedido.statusPagamento === StatusPagamentoPedido.AGUARDANDO
        ? new Date(pedido.createdAt.getTime() + env.PEDIDO_CANCELA_HORAS * 60 * 60 * 1000).toISOString()
        : null,
  };
}

/** Primeiro instante do mes corrente, no fuso do servidor. */
function inicioDoMes() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), 1);
}

export async function resumoDoMes() {
  const desde = inicioDoMes();

  const [quantidade, soma] = await Promise.all([
    // So os pagos, o mesmo criterio do valor arrecadado. Contar os que ainda
    // aguardam pagamento inflava o numero e nao batia com o dinheiro ao lado.
    prisma.pedido.count({
      where: { createdAt: { gte: desde }, ...PAGO },
    }),
    prisma.pedido.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: desde }, ...PAGO },
    }),
  ]);

  return {
    quantidade,
    arrecadado: (soma._sum.total ?? 0).toString(),
  };
}

export interface ItemEntrada {
  produtoId: string;
  quantidade: number;
  /** Encomenda da versao personalizada pela IA, em vez da arte original. */
  geracaoId?: string;
}

export interface FreteEntrada {
  /** endereco salvo do cliente; o CEP sai dele, nao do que o app manda */
  enderecoId: string;
  /** id do servico no Melhor Envio; o preco a gente reconfere com eles */
  servicoId: number;
}

export async function criarPedido(usuarioId: string, itens: ItemEntrada[], frete?: FreteEntrada) {
  if (!itens.length) throw badRequest('O pedido precisa de pelo menos um item');

  // Junta duplicados. A chave inclui a geracao: o mesmo painel com dois temas
  // diferentes sao duas linhas, nao uma com quantidade 2.
  const agrupado = new Map<string, ItemEntrada>();
  for (const item of itens) {
    const chave = `${item.produtoId}|${item.geracaoId ?? ''}`;
    const atual = agrupado.get(chave);
    if (atual) atual.quantidade += item.quantidade;
    else agrupado.set(chave, { ...item });
  }
  const entradas = [...agrupado.values()];

  const produtos = await prisma.produto.findMany({
    where: { id: { in: [...new Set(entradas.map((e) => e.produtoId))] }, ativo: true },
  });
  const porId = new Map(produtos.map((p) => [p.id, p]));

  if (entradas.some((e) => !porId.has(e.produtoId))) {
    throw badRequest('Algum produto do carrinho nao esta mais disponivel');
  }

  // Confere que cada imagem gerada e mesmo daquele cliente e daquele produto —
  // senao daria pra encomendar a arte de outra pessoa passando o id dela.
  const geracaoIds = entradas.map((e) => e.geracaoId).filter((id): id is string => !!id);
  const geracoes = geracaoIds.length
    ? await prisma.geracaoImagem.findMany({ where: { id: { in: geracaoIds }, usuarioId } })
    : [];
  const geracaoPorId = new Map(geracoes.map((g) => [g.id, g]));

  for (const entrada of entradas) {
    if (!entrada.geracaoId) continue;
    const geracao = geracaoPorId.get(entrada.geracaoId);
    if (!geracao || geracao.produtoId !== entrada.produtoId) {
      throw badRequest('Essa personalizacao nao esta disponivel');
    }
  }

  // O preco vem do banco, nunca do cliente. A versao personalizada custa o
  // mesmo que a original: muda so a arte que vai ser produzida.
  const linhas = entradas.map((entrada) => {
    const produto = porId.get(entrada.produtoId) as (typeof produtos)[number];
    return {
      tipo: 'PRODUTO' as const,
      produtoId: produto.id,
      quantidade: entrada.quantidade,
      precoUnitario: produto.preco,
      geracaoImagemId: entrada.geracaoId ?? null,
    };
  });

  const subtotal = linhas.reduce(
    (soma, linha) => soma.add(new Prisma.Decimal(linha.precoUnitario).mul(linha.quantidade)),
    new Prisma.Decimal(0),
  );

  // Mesmo cuidado do preco do produto: o valor do frete vem de uma nova
  // consulta ao Melhor Envio, nao do que o app enviou.
  let dadosFrete = {};
  let total = subtotal;

  if (frete) {
    // O endereco vem do banco (e do proprio usuario), entao o CEP cotado e o
    // que ele cadastrou — nao um que o app pudesse forjar pra baratear o frete.
    const endereco = await getEndereco(frete.enderecoId, usuarioId);
    const escolhido = await precoDoServico(endereco.cep, itens, frete.servicoId);
    const valor = new Prisma.Decimal(escolhido.preco);
    total = subtotal.add(valor);
    dadosFrete = {
      cepDestino: endereco.cep,
      // Copia do endereco: se ele for editado ou apagado depois, o pedido
      // continua mostrando pra onde foi enviado de fato.
      enderecoLogradouro: endereco.logradouro,
      enderecoNumero: endereco.numero,
      enderecoComplemento: endereco.complemento,
      enderecoBairro: endereco.bairro,
      enderecoCidade: endereco.cidade,
      enderecoUf: endereco.uf,
      freteValor: valor,
      freteServico: escolhido.nome,
      freteTransportadora: escolhido.transportadora,
      fretePrazoDias: escolhido.prazoDias,
    };
  }

  const criado = await prisma.pedido.create({
    data: { usuarioId, subtotal, total, ...dadosFrete, itens: { create: linhas } },
    include: INCLUDE_PEDIDO,
  });
  return comPrazo(criado);
}

/**
 * Pedido sem pagamento morre em dois tempos.
 *
 * 1. Passadas 24h aguardando, vira CANCELADO. Sai da fila do admin e da conta
 *    de "a receber", mas continua no lugar: se o cliente reclamar, o pedido
 *    esta la e da pra voltar atras.
 * 2. Passados 7 dias, e apagado de vez — pedido, itens e tentativas de
 *    pagamento.
 *
 * O passo 2 nao tem volta, entao a condicao e estreita de proposito: so
 * cancelado, so quem passou do prazo, e so quem nunca teve pagamento aprovado.
 * Esse ultimo filtro protege o pedido que foi pago e depois cancelado (um
 * estorno, por exemplo) — esse fica.
 *
 * A imagem gerada pela IA NAO some junto: o item so aponta pra ela, e ela e do
 * cliente, nao do pedido.
 *
 * Roda na leitura da lista em vez de num agendador porque o servidor vive em
 * ambiente sem processo continuo — um setInterval nao sobreviveria ali. Rodar
 * duas vezes ao mesmo tempo nao e problema: a segunda nao acha mais nada.
 */
export async function limparPedidosNaoPagos() {
  const agora = Date.now();
  const limiteCancelar = new Date(agora - env.PEDIDO_CANCELA_HORAS * 60 * 60 * 1000);
  const limiteApagar = new Date(agora - env.PEDIDO_APAGA_DIAS * 24 * 60 * 60 * 1000);

  const cancelados = await prisma.pedido.updateMany({
    where: { statusPagamento: StatusPagamentoPedido.AGUARDANDO, createdAt: { lt: limiteCancelar } },
    data: { statusPagamento: StatusPagamentoPedido.CANCELADO },
  });

  const vencidos = await prisma.pedido.findMany({
    where: {
      statusPagamento: StatusPagamentoPedido.CANCELADO,
      createdAt: { lt: limiteApagar },
      // Nunca chegou a ser pago: se houve aprovacao, o pedido fica pro
      // historico, mesmo cancelado depois.
      pagamentos: { none: { status: 'APROVADO' } },
    },
    select: { id: true },
  });

  let apagados = 0;
  if (vencidos.length) {
    const ids = vencidos.map((p) => p.id);
    // Os filhos primeiro: as relacoes nao tem cascata, entao apagar o pedido
    // direto seria recusado pelo banco. Numa transacao pra nunca existir um
    // instante com item apontando pra pedido que ja sumiu.
    await prisma.$transaction([
      prisma.pagamento.deleteMany({ where: { pedidoId: { in: ids } } }),
      prisma.itemPedido.deleteMany({ where: { pedidoId: { in: ids } } }),
      prisma.pedido.deleteMany({ where: { id: { in: ids } } }),
    ]);
    apagados = ids.length;
  }

  if (cancelados.count || apagados) {
    console.warn(
      `[pedidos] limpeza automatica: ${cancelados.count} cancelado(s) por ${env.PEDIDO_CANCELA_HORAS}h sem pagamento, ${apagados} apagado(s) por ${env.PEDIDO_APAGA_DIAS} dias`,
    );
  }
  return { cancelados: cancelados.count, apagados };
}

/**
 * A limpeza pega carona na leitura da lista, mas nao pode derrubar a leitura:
 * uma falha na faxina deixaria o cliente sem ver os pedidos dele, o que e bem
 * pior que um pedido velho ficar mais um tempo na lista. Falhou, segue o jogo
 * e tenta de novo na proxima consulta.
 */
async function limpezaSilenciosa() {
  try {
    await limparPedidosNaoPagos();
  } catch (erro) {
    console.error('[pedidos] limpeza automatica falhou, seguindo com a listagem:', erro);
  }
}

export async function listarMeusPedidos(usuarioId: string) {
  await limpezaSilenciosa();
  const pedidos = await prisma.pedido.findMany({
    where: { usuarioId },
    orderBy: { createdAt: 'desc' },
    include: INCLUDE_PEDIDO,
  });
  return pedidos.map(comPrazo);
}

export async function listarPedidosAdmin() {
  await limpezaSilenciosa();
  const pedidos = await prisma.pedido.findMany({ orderBy: { createdAt: 'desc' }, include: INCLUDE_PEDIDO });
  return pedidos.map(comPrazo);
}

export async function getPedido(id: string, opcoes?: { usuarioId?: string }) {
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: INCLUDE_PEDIDO });
  if (!pedido) throw notFound('Pedido nao encontrado');
  // Cliente so enxerga o proprio pedido; admin chama sem usuarioId.
  if (opcoes?.usuarioId && pedido.usuarioId !== opcoes.usuarioId) {
    throw notFound('Pedido nao encontrado');
  }
  return comPrazo(pedido);
}

/**
 * Os dois eixos sao independentes e o admin mexe num de cada vez, entao os
 * campos vem separados e so o que veio e gravado.
 */
export async function atualizarStatus(
  id: string,
  mudanca: { statusPagamento?: StatusPagamentoPedido; statusProducao?: StatusProducao },
) {
  await getPedido(id);

  const data: Prisma.PedidoUpdateInput = {};
  if (mudanca.statusPagamento) data.statusPagamento = mudanca.statusPagamento;
  if (mudanca.statusProducao) data.statusProducao = mudanca.statusProducao;
  if (!Object.keys(data).length) throw badRequest('Informe o status de pagamento ou o de producao');

  const atualizado = await prisma.pedido.update({ where: { id }, data, include: INCLUDE_PEDIDO });
  return comPrazo(atualizado);
}

// ---------------------------------------------------------------------------
// Painel financeiro
// ---------------------------------------------------------------------------

/** Quantos meses de historico o grafico mostra. */
const MESES_NO_HISTORICO = 12;
/** Quantos produtos entram no ranking de mais vendidos. */
const TOP_PRODUTOS = 5;

function inicioDoDia() {
  const a = new Date();
  return new Date(a.getFullYear(), a.getMonth(), a.getDate());
}

function inicioDoAno() {
  return new Date(new Date().getFullYear(), 0, 1);
}

/** Primeiro dia do mes, N meses atras. */
function inicioDeMesesAtras(meses: number) {
  const a = new Date();
  return new Date(a.getFullYear(), a.getMonth() - meses, 1);
}

/** "2026-08" — chave estavel pra agrupar, sem depender de fuso na string. */
function chaveDoMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

async function totalNoPeriodo(desde: Date) {
  const [pedidos, soma] = await Promise.all([
    prisma.pedido.count({ where: { createdAt: { gte: desde }, ...PAGO } }),
    prisma.pedido.aggregate({ _sum: { total: true }, where: { createdAt: { gte: desde }, ...PAGO } }),
  ]);
  return { pedidos, receita: (soma._sum.total ?? 0).toString() };
}

/**
 * Tudo daqui olha so pedido com pagamento PAGO — e dinheiro que entrou. As
 * duas excecoes estao nomeadas: `aReceber` (ainda aguardando) e `cancelados`.
 *
 * A loja tem poucos pedidos, entao os agrupamentos que o Prisma nao faz num
 * aggregate (receita por mes, ranking de produtos) sao somados aqui mesmo, em
 * memoria. Se um dia o volume crescer, viram consulta agregada no banco.
 */
export async function painelFinanceiro() {
  const desdeHistorico = inicioDeMesesAtras(MESES_NO_HISTORICO - 1);

  const [hoje, semana, mes, ano, aReceberAgg, canceladosAgg, composicaoAgg, doHistorico, itensVendidos, porMetodoAgg] =
    await Promise.all([
      totalNoPeriodo(inicioDoDia()),
      totalNoPeriodo(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
      totalNoPeriodo(inicioDoMes()),
      totalNoPeriodo(inicioDoAno()),

      prisma.pedido.aggregate({
        _sum: { total: true },
        _count: true,
        where: { statusPagamento: StatusPagamentoPedido.AGUARDANDO },
      }),
      prisma.pedido.aggregate({
        _sum: { total: true },
        _count: true,
        where: { statusPagamento: StatusPagamentoPedido.CANCELADO },
      }),
      // Quanto do faturamento e produto e quanto e frete — o frete entra e sai,
      // entao misturar os dois esconde a margem real. A parte de produto sai de
      // `total - frete`, e nao do `subtotal`: pedido feito antes da coluna
      // subtotal existir ficou com 0 ali, e a conta daria zero pra tudo.
      prisma.pedido.aggregate({ _sum: { total: true, freteValor: true }, where: PAGO }),

      prisma.pedido.findMany({
        where: { createdAt: { gte: desdeHistorico }, ...PAGO },
        select: { createdAt: true, total: true },
      }),
      prisma.itemPedido.findMany({
        where: { pedido: PAGO },
        select: { quantidade: true, precoUnitario: true, produto: { select: { id: true, nome: true } } },
      }),
      prisma.pagamento.groupBy({
        by: ['metodo'],
        _sum: { valor: true },
        _count: true,
        where: { status: 'APROVADO' },
      }),
    ]);

  // Receita por mes, com os meses vazios preenchidos: sem isso o grafico
  // pularia de marco pra maio como se maio viesse logo depois.
  const acumulado = new Map<string, { pedidos: number; receita: number }>();
  for (let i = MESES_NO_HISTORICO - 1; i >= 0; i--) {
    acumulado.set(chaveDoMes(inicioDeMesesAtras(i)), { pedidos: 0, receita: 0 });
  }
  for (const pedido of doHistorico) {
    const linha = acumulado.get(chaveDoMes(pedido.createdAt));
    if (!linha) continue;
    linha.pedidos += 1;
    linha.receita += Number(pedido.total);
  }
  const porMes = [...acumulado.entries()].map(([mes, v]) => ({
    mes,
    pedidos: v.pedidos,
    receita: v.receita.toFixed(2),
  }));

  // Ranking de produtos. O groupBy do Prisma nao multiplica preco x quantidade,
  // entao a soma sai daqui.
  const porProduto = new Map<string, { nome: string; quantidade: number; receita: number }>();
  for (const item of itensVendidos) {
    if (!item.produto) continue;
    const atual = porProduto.get(item.produto.id) ?? { nome: item.produto.nome, quantidade: 0, receita: 0 };
    atual.quantidade += item.quantidade;
    atual.receita += Number(item.precoUnitario) * item.quantidade;
    porProduto.set(item.produto.id, atual);
  }
  const topProdutos = [...porProduto.values()]
    .sort((a, b) => b.receita - a.receita)
    .slice(0, TOP_PRODUTOS)
    .map((p) => ({ nome: p.nome, quantidade: p.quantidade, receita: p.receita.toFixed(2) }));

  const receitaDoAno = Number(ano.receita);
  const ticketMedio = ano.pedidos > 0 ? (receitaDoAno / ano.pedidos).toFixed(2) : '0.00';
  const freteTotal = Number(composicaoAgg._sum.freteValor ?? 0);

  return {
    hoje,
    semana,
    mes,
    ano,
    aReceber: { pedidos: aReceberAgg._count, valor: (aReceberAgg._sum.total ?? 0).toString() },
    cancelados: { pedidos: canceladosAgg._count, valor: (canceladosAgg._sum.total ?? 0).toString() },
    ticketMedio,
    composicao: {
      produtos: (Number(composicaoAgg._sum.total ?? 0) - freteTotal).toFixed(2),
      frete: freteTotal.toFixed(2),
    },
    porMes,
    topProdutos,
    porMetodo: porMetodoAgg.map((m) => ({
      metodo: m.metodo,
      pedidos: m._count,
      valor: (m._sum.valor ?? 0).toString(),
    })),
  };
}
