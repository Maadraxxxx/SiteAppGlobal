import { StatusPedido } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import * as pagamentosService from '../pagamentos/service';
import * as pedidosService from './service';

const criarSchema = z.object({
  itens: z
    .array(z.object({ produtoId: z.string().uuid(), quantidade: z.number().int().positive() }))
    .min(1),
});

const statusSchema = z.object({ status: z.nativeEnum(StatusPedido) });

export default async function pedidosRoutes(app: FastifyInstance) {
  app.register(async (scope) => {
    scope.addHook('preHandler', authenticate);

    scope.post('/pedidos', async (request, reply) => {
      const { itens } = criarSchema.parse(request.body);
      const pedido = await pedidosService.criarPedido(request.user.sub, itens);
      return reply.code(201).send({ pedido });
    });

    scope.get('/pedidos', async (request, reply) => {
      const itens = await pedidosService.listarMeusPedidos(request.user.sub);
      return reply.send({ items: itens });
    });

    scope.get('/pedidos/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const pedido = await pedidosService.getPedido(id, { usuarioId: request.user.sub });
      return reply.send({ pedido });
    });

    scope.post('/pedidos/:id/pagamento/pix', async (request, reply) => {
      const { id } = request.params as { id: string };
      const pagamento = await pagamentosService.criarPix(id, request.user.sub);
      return reply.code(201).send({ pagamento });
    });

    scope.get('/pedidos/:id/pagamento', async (request, reply) => {
      const { id } = request.params as { id: string };
      const pagamento = await pagamentosService.sincronizarPagamento(id, request.user.sub);
      return reply.send({ pagamento });
    });
  });

  app.register(
    async (adminScope) => {
      adminScope.addHook('preHandler', authenticate);
      adminScope.addHook('preHandler', requireAdmin);

      adminScope.get('/resumo-mes', async (_request, reply) => {
        const resumo = await pedidosService.resumoDoMes();
        return reply.send({ resumo });
      });

      adminScope.get('/', async (_request, reply) => {
        const itens = await pedidosService.listarPedidosAdmin();
        return reply.send({ items: itens });
      });

      adminScope.get('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const pedido = await pedidosService.getPedido(id);
        return reply.send({ pedido });
      });

      adminScope.put('/:id/status', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { status } = statusSchema.parse(request.body);
        const pedido = await pedidosService.atualizarStatus(id, status);
        return reply.send({ pedido });
      });
    },
    { prefix: '/admin/pedidos' },
  );
}
