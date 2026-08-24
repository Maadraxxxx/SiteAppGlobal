import type { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../../middleware/auth';
import * as pedidosService from './service';

export default async function pedidosRoutes(app: FastifyInstance) {
  app.register(
    async (adminScope) => {
      adminScope.addHook('preHandler', authenticate);
      adminScope.addHook('preHandler', requireAdmin);

      adminScope.get('/resumo-mes', async (_request, reply) => {
        const resumo = await pedidosService.resumoDoMes();
        return reply.send({ resumo });
      });
    },
    { prefix: '/admin/pedidos' },
  );
}
