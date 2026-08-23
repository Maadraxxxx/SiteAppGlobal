import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma';
import { registerTagResource } from '../../lib/tag-resource';

export default async function estilosRoutes(app: FastifyInstance) {
  registerTagResource(app, {
    prefix: '/estilos',
    delegate: prisma.estilo,
    produtosEmUso: (id) => prisma.produto.count({ where: { estiloId: id } }),
  });
}
