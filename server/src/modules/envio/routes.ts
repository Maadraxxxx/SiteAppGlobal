import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import * as envioService from './service';

const rastreioSchema = z.object({ codigo: z.string().min(5).max(60) });

export default async function envioRoutes(app: FastifyInstance) {
  // Cliente acompanha o próprio pedido.
  app.get('/pedidos/:id/rastreio', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const rastreio = await envioService.rastreioDoPedido(id, request.user.sub);
    return reply.send({ rastreio });
  });

  app.register(
    async (adminScope) => {
      adminScope.addHook('preHandler', authenticate);
      adminScope.addHook('preHandler', requireAdmin);

      adminScope.post('/:id/etiqueta', async (request, reply) => {
        const { id } = request.params as { id: string };
        const pedido = await envioService.gerarEtiqueta(id);
        return reply.send({ pedido });
      });

      adminScope.put('/:id/rastreio', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { codigo } = rastreioSchema.parse(request.body);
        const pedido = await envioService.definirRastreioManual(id, codigo);
        return reply.send({ pedido });
      });

      adminScope.get('/:id/rastreio', async (request, reply) => {
        const { id } = request.params as { id: string };
        const rastreio = await envioService.rastreioDoPedido(id);
        return reply.send({ rastreio });
      });
    },
    { prefix: '/admin/pedidos' },
  );
}
