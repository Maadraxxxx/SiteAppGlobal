import { Prisma, StatusPagamentoPedido, StatusProducao } from '@prisma/client';
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

  return prisma.pedido.create({
    data: { usuarioId, subtotal, total, ...dadosFrete, itens: { create: linhas } },
    include: INCLUDE_PEDIDO,
  });
}

export function listarMeusPedidos(usuarioId: string) {
  return prisma.pedido.findMany({
    where: { usuarioId },
    orderBy: { createdAt: 'desc' },
    include: INCLUDE_PEDIDO,
  });
}

export function listarPedidosAdmin() {
  return prisma.pedido.findMany({ orderBy: { createdAt: 'desc' }, include: INCLUDE_PEDIDO });
}

export async function getPedido(id: string, opcoes?: { usuarioId?: string }) {
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: INCLUDE_PEDIDO });
  if (!pedido) throw notFound('Pedido nao encontrado');
  // Cliente so enxerga o proprio pedido; admin chama sem usuarioId.
  if (opcoes?.usuarioId && pedido.usuarioId !== opcoes.usuarioId) {
    throw notFound('Pedido nao encontrado');
  }
  return pedido;
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

  return prisma.pedido.update({ where: { id }, data, include: INCLUDE_PEDIDO });
}
