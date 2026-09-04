import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { notFound } from '../../lib/http-error';

export interface ListProdutosFilters {
  categoria?: string;
  formato?: string;
  estilo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  incluirInativos?: boolean;
}

const include = { categoria: true, formato: true, estilo: true } satisfies Prisma.ProdutoInclude;

export async function listProdutos(filters: ListProdutosFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 50) : 20;

  const where: Prisma.ProdutoWhereInput = {
    ativo: filters.incluirInativos ? undefined : true,
    categoria: filters.categoria ? { slug: filters.categoria } : undefined,
    formato: filters.formato ? { slug: filters.formato } : undefined,
    estilo: filters.estilo ? { slug: filters.estilo } : undefined,
    nome: filters.search ? { contains: filters.search, mode: 'insensitive' } : undefined,
  };

  const [items, total] = await Promise.all([
    prisma.produto.findMany({
      where,
      include,
      // O id desempata. Sem ele, dois produtos cadastrados no mesmo instante
      // podem trocar de lugar entre uma pagina e outra — e na rolagem infinita
      // isso aparece como item repetido ou item que sumiu.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.produto.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getProduto(id: string, opts: { incluirInativo?: boolean } = {}) {
  const produto = await prisma.produto.findUnique({ where: { id }, include });
  if (!produto) throw notFound('Produto nao encontrado');
  if (!produto.ativo && !opts.incluirInativo) throw notFound('Produto nao encontrado');
  return produto;
}

export interface ProdutoInput {
  nome: string;
  descricao?: string;
  preco: number;
  comprimento?: number;
  largura?: number;
  altura?: number;
  peso?: number;
  imagemUrl?: string;
  categoriaId: string;
  formatoId: string;
  estiloId: string;
}

export function createProduto(input: ProdutoInput) {
  return prisma.produto.create({ data: input, include });
}

export async function updateProduto(id: string, input: ProdutoInput) {
  await getProduto(id, { incluirInativo: true });
  return prisma.produto.update({ where: { id }, data: input, include });
}

export async function setProdutoAtivo(id: string, ativo: boolean) {
  await getProduto(id, { incluirInativo: true });
  return prisma.produto.update({ where: { id }, data: { ativo } });
}

/**
 * Os produtos que mais sairam, contando so pedido com pagamento aprovado —
 * carrinho abandonado e pedido cancelado nao viram venda.
 *
 * Quando ainda nao ha venda suficiente pra encher a vitrine, o resto vem dos
 * cadastrados mais recentes. Loja nova tem zero pedido pago, e um "Destaques"
 * vazio na entrada da loja e pior que um desatualizado.
 */
export async function maisVendidos(limite = 8) {
  // Uma consulta so resolve o ranking inteiro. Antes eram tres, em sequencia:
  // agrupar as vendas, buscar esses produtos, e completar com os mais novos.
  // Cada ida ao banco custa uma volta de rede, e isso aparecia na tela inicial.
  //
  // O LEFT JOIN faz o produto sem venda entrar com zero, entao a mesma ordem
  // ja traz o ranking e o preenchimento: quem vendeu mais primeiro, o resto
  // por data de cadastro. Filtrar `ativo` aqui tambem corrige um detalhe da
  // versao anterior — la um campeao de vendas desativado ocupava uma vaga do
  // ranking e sumia depois, encurtando a vitrine.
  const ordenados = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM produtos p
    LEFT JOIN (
      SELECT i."produtoId" AS pid, SUM(i.quantidade) AS qtd
      FROM itens_do_pedido i
      JOIN pedidos ped ON ped.id = i."pedidoId"
      WHERE ped."statusPagamento" = 'PAGO'
      GROUP BY i."produtoId"
    ) v ON v.pid = p.id
    WHERE p.ativo = true
    ORDER BY COALESCE(v.qtd, 0) DESC, p."createdAt" DESC, p.id DESC
    LIMIT ${limite}
  `;

  const ids = ordenados.map((linha) => linha.id);
  if (!ids.length) return { items: [], total: 0 };

  const produtos = await prisma.produto.findMany({ where: { id: { in: ids } }, include });

  // O findMany devolve na ordem do banco, nao na do ranking.
  const porId = new Map(produtos.map((produto) => [produto.id, produto]));
  const items = ids.map((id) => porId.get(id)).filter((p) => !!p);

  return { items, total: items.length };
}
