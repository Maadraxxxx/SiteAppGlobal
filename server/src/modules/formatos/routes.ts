import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma';
import { registerTagResource } from '../../lib/tag-resource';

export default async function formatosRoutes(app: FastifyInstance) {
  registerTagResource(app, {
    prefix: '/formatos',
    delegate: prisma.formato,
    produtosEmUso: (id) => prisma.produto.count({ where: { formatoId: id } }),
  });
}
