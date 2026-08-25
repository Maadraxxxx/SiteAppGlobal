import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import * as iaService from './service';

const comprarSchema = z.object({ quantidade: z.number().int().min(1).max(50) });

export default async function iaRoutes(app: FastifyInstance) {
  app.register(
    async (scope) => {
      scope.addHook('preHandler', authenticate);

      scope.get('/saldo', async (request, reply) => {
        const saldo = await iaService.saldo(request.user.sub);
        return reply.send({ saldo });
      });

      scope.get('/historico', async (request, reply) => {
        const items = await iaService.historico(request.user.sub);
        return reply.send({ items });
      });

      scope.post('/creditos', async (request, reply) => {
        const { quantidade } = comprarSchema.parse(request.body);
        const compra = await iaService.comprarCreditos(request.user.sub, quantidade);
        return reply.code(201).send({ compra });
      });

      scope.get('/creditos/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const compra = await iaService.sincronizarCompra(id, request.user.sub);
        return reply.send({ compra });
      });
    },
    { prefix: '/ia' },
  );
}
