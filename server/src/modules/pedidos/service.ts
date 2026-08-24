import { Prisma, StatusPedido } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { badRequest, notFound } from '../../lib/http-error';
import { precoDoServico } from '../frete/service';

// "Arrecadado" e dinheiro que de fato entrou, entao pedido ainda aguardando
// pagamento nao entra na soma — so os status que ja passaram pelo pagamento.
const STATUS_PAGOS: StatusPedido[] = [
  StatusPedido.PAGO,
  StatusPedido.EM_PRODUCAO,
  StatusPedido.ENVIADO,
  StatusPedido.CONCLUIDO,
];

const INCLUDE_PEDIDO = {
  itens: { include: { produto: true } },
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
    // Cancelado nao conta como pedido do mes pra quem olha o resumo.
    prisma.pedido.count({
      where: { createdAt: { gte: desde }, status: { not: StatusPedido.CANCELADO } },
    }),
    prisma.pedido.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: desde }, status: { in: STATUS_PAGOS } },
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
}

export interface FreteEntrada {
  cep: string;
  /** id do servico no Melhor Envio; o preco a gente reconfere com eles */
  servicoId: number;
}

export async function criarPedido(usuarioId: string, itens: ItemEntrada[], frete?: FreteEntrada) {
  if (!itens.length) throw badRequest('O pedido precisa de pelo menos um item');

  // Junta duplicados: dois itens do mesmo produto viram um com a soma.
  const porProduto = new Map<string, number>();
  for (const item of itens) {
    porProduto.set(item.produtoId, (porProduto.get(item.produtoId) ?? 0) + item.quantidade);
  }

  const produtos = await prisma.produto.findMany({
    where: { id: { in: [...porProduto.keys()] }, ativo: true },
  });

  if (produtos.length !== porProduto.size) {
    throw badRequest('Algum produto do carrinho nao esta mais disponivel');
  }

  // O preco vem do banco, nunca do cliente — senao daria pra fechar pedido
  // com o valor que o app mandasse.
  const linhas = produtos.map((produto) => {
    const quantidade = porProduto.get(produto.id) as number;
    return {
      tipo: 'PRODUTO' as const,
      produtoId: produto.id,
      quantidade,
      precoUnitario: produto.preco,
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
    const escolhido = await precoDoServico(frete.cep, itens, frete.servicoId);
    const valor = new Prisma.Decimal(escolhido.preco);
    total = subtotal.add(valor);
    dadosFrete = {
      cepDestino: frete.cep,
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

export async function atualizarStatus(id: string, status: StatusPedido) {
  await getPedido(id);
  return prisma.pedido.update({ where: { id }, data: { status }, include: INCLUDE_PEDIDO });
}
