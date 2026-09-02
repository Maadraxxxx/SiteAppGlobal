import type { Prisma, Role } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { badRequest, notFound } from '../../lib/http-error';

/** Nunca devolve senhaHash: o painel não tem o que fazer com ela. */
const selecao = {
  id: true,
  nome: true,
  email: true,
  role: true,
  avatarUrl: true,
  createdAt: true,
} satisfies Prisma.UsuarioSelect;

export interface ListUsuariosFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listUsuarios(filters: ListUsuariosFilters) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 50) : 20;

  const where: Prisma.UsuarioWhereInput = filters.search
    ? {
        OR: [
          { nome: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      select: selecao,
      // Admin primeiro: é a lista curta, e é quem se vem conferir aqui. O
      // enum é declarado como CLIENTE, ADMIN — por isso 'desc'. Depois por
      // data de cadastro, com o id desempatando pra paginação não embaralhar.
      orderBy: [{ role: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.usuario.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

/**
 * Troca o cargo de alguém.
 *
 * Duas travas, e as duas existem pelo mesmo motivo: um painel sem nenhum admin
 * não tem como se consertar sozinho — só mexendo direto no banco.
 */
export async function definirRole(id: string, role: Role, quemPediu: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: selecao });
  if (!usuario) throw notFound('Usuario nao encontrado');

  if (usuario.role === role) return usuario;

  if (role === 'CLIENTE') {
    if (id === quemPediu) {
      throw badRequest('Você não pode tirar o próprio acesso de administrador.');
    }

    const admins = await prisma.usuario.count({ where: { role: 'ADMIN' } });
    if (admins <= 1) {
      throw badRequest('Este é o único administrador — promova outra pessoa antes de rebaixá-lo.');
    }
  }

  return prisma.usuario.update({ where: { id }, data: { role }, select: selecao });
}
