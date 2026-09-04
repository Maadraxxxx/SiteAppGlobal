import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import * as chamadosService from './service';

const abrirSchema = z.object({
  assunto: z.string().min(3, 'Diga o assunto em pelo menos 3 caracteres').max(120),
  mensagem: z.string().min(10, 'Conte o que aconteceu em pelo menos 10 caracteres').max(4000),
  pedidoId: z.string().uuid().optional(),
});

const mensagemSchema = z.object({
  texto: z.string().min(1).max(4000),
});

const statusSchema = z.object({
  status: z.enum(['ABERTO', 'RESPONDIDO', 'RESOLVIDO']),
});

export default async function chamadosRoutes(app: FastifyInstance) {
  // --- Cliente: só enxerga os próprios chamados ---
  app.register(async (clienteScope) => {
    clienteScope.addHook('preHandler', authenticate);

    clienteScope.get('/chamados', async (request, reply) => {
      const resultado = await chamadosService.listarDoCliente(request.user.sub);
      return reply.send(resultado);
    });

    clienteScope.post('/chamados', async (request, reply) => {
      const input = abrirSchema.parse(request.body);
      const chamado = await chamadosService.abrir(request.user.sub, input);
      return reply.code(201).send({ chamado });
    });

    clienteScope.get('/chamados/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const chamado = await chamadosService.obter(id, request.user.sub);
      return reply.send({ chamado });
    });

    clienteScope.post('/chamados/:id/mensagens', async (request, reply) => {
      const { id } = request.params as { id: string };
      const { texto } = mensagemSchema.parse(request.body);
      // O dono é passado adiante: é ele que impede escrever na conversa alheia.
      const chamado = await chamadosService.responder(id, texto, 'CLIENTE', request.user.sub);
      return reply.send({ chamado });
    });
  });

  // --- Admin: enxerga todos e responde pela loja ---
  app.register(
    async (adminScope) => {
      adminScope.addHook('preHandler', authenticate);
      adminScope.addHook('preHandler', requireAdmin);

      adminScope.get('/', async (request, reply) => {
        const { status } = request.query as { status?: string };
        const resultado = await chamadosService.listarParaAdmin({
          status: status === 'ABERTO' || status === 'RESPONDIDO' || status === 'RESOLVIDO'
            ? status
            : undefined,
        });
        return reply.send(resultado);
      });

      adminScope.get('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const chamado = await chamadosService.obter(id);
        return reply.send({ chamado });
      });

      adminScope.post('/:id/mensagens', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { texto } = mensagemSchema.parse(request.body);
        const chamado = await chamadosService.responder(id, texto, 'LOJA');
        return reply.send({ chamado });
      });

      adminScope.put('/:id/status', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { status } = statusSchema.parse(request.body);
        const chamado = await chamadosService.definirStatus(id, status);
        return reply.send({ chamado });
      });
    },
    { prefix: '/admin/chamados' },
  );
}
