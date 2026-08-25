import { StatusPagamentoPedido, StatusProducao } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import * as pagamentosService from '../pagamentos/service';
import * as pedidosService from './service';

const criarSchema = z.object({
  itens: z
    .array(
      z.object({
        produtoId: z.string().uuid(),
        quantidade: z.number().int().positive(),
        geracaoId: z.string().uuid().optional(),
      }),
    )
    .min(1),
  frete: z.object({ enderecoId: z.string().uuid(), servicoId: z.number().int() }).optional(),
});

// Os dois eixos sao opcionais e independentes: o admin muda um de cada vez.
// O service recusa se nenhum vier.
const statusSchema = z.object({
  statusPagamento: z.nativeEnum(StatusPagamentoPedido).optional(),
  statusProducao: z.nativeEnum(StatusProducao).optional(),
});

export default async function pedidosRoutes(app: FastifyInstance) {
  app.register(async (scope) => {
    scope.addHook('preHandler', authenticate);

    scope.post('/pedidos', async (request, reply) => {
      const { itens, frete } = criarSchema.parse(request.body);
      const pedido = await pedidosService.criarPedido(request.user.sub, itens, frete);
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
        const mudanca = statusSchema.parse(request.body);
        const pedido = await pedidosService.atualizarStatus(id, mudanca);
        return reply.send({ pedido });
      });
    },
    { prefix: '/admin/pedidos' },
  );
}
