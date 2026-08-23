import { prisma } from '../../db/prisma';
import { conflict, notFound, slugify } from '../../lib/http-error';

export function listCategorias() {
  return prisma.categoria.findMany({ orderBy: { nome: 'asc' } });
}

export async function getCategoria(id: string) {
  const categoria = await prisma.categoria.findUnique({ where: { id } });
  if (!categoria) throw notFound('Categoria nao encontrada');
  return categoria;
}

export async function createCategoria(nome: string, descricao?: string) {
  const slug = slugify(nome);
  const existing = await prisma.categoria.findUnique({ where: { slug } });
  if (existing) throw conflict('Ja existe uma categoria com esse nome');
  return prisma.categoria.create({ data: { nome, slug, descricao } });
}

export async function updateCategoria(id: string, nome: string, descricao?: string) {
  await getCategoria(id);
  const slug = slugify(nome);
  return prisma.categoria.update({ where: { id }, data: { nome, slug, descricao } });
}

export async function deleteCategoria(id: string) {
  await getCategoria(id);
  const emUso = await prisma.produto.count({ where: { categoriaId: id } });
  if (emUso > 0) throw conflict(`Ainda em uso por ${emUso} produto(s) — nao pode ser removida`);
  await prisma.categoria.delete({ where: { id } });
}
