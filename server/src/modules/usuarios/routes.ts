import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import * as usuariosService from './service';

const roleSchema = z.object({ role: z.enum(['CLIENTE', 'ADMIN']) });

export default async function usuariosRoutes(app: FastifyInstance) {
  app.register(
    async (adminScope) => {
      adminScope.addHook('preHandler', authenticate);
      adminScope.addHook('preHandler', requireAdmin);

      adminScope.get('/', async (request, reply) => {
        const { search, page, pageSize } = request.query as {
          search?: string;
          page?: string;
          pageSize?: string;
        };
        const resultado = await usuariosService.listUsuarios({
          search,
          page: page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
        });
        return reply.send(resultado);
      });

      adminScope.put('/:id/role', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { role } = roleSchema.parse(request.body);
        // Quem pediu importa: o serviço proíbe tirar o próprio acesso.
        const usuario = await usuariosService.definirRole(id, role, request.user.sub);
        return reply.send({ usuario });
      });
    },
    { prefix: '/admin/usuarios' },
  );
}
