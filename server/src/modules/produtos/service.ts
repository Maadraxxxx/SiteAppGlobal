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
      orderBy: { createdAt: 'desc' },
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
  medidas?: string;
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
