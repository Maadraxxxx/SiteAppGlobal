import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import * as categoriasService from './service';

const categoriaSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
});

/** Ligar/desligar a vitrine da Home e uma acao so, separada do cadastro. */
const naHomeSchema = z.object({ naHome: z.boolean() });

export default async function categoriasRoutes(app: FastifyInstance) {
  app.get('/categorias', async (_request, reply) => {
    const items = await categoriasService.listCategorias();
    return reply.send({ items });
  });

  app.get('/categorias/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const categoria = await categoriasService.getCategoria(id);
    return reply.send({ categoria });
  });

  app.register(async (adminScope) => {
    adminScope.addHook('preHandler', authenticate);
    adminScope.addHook('preHandler', requireAdmin);

    adminScope.get('/', async (_request, reply) => {
      const items = await categoriasService.listCategorias();
      return reply.send({ items });
    });

    adminScope.post('/', async (request, reply) => {
      const { nome, descricao } = categoriaSchema.parse(request.body);
      const categoria = await categoriasService.createCategoria(nome, descricao);
      return reply.code(201).send({ categoria });
    });

    adminScope.put('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const { nome, descricao } = categoriaSchema.parse(request.body);
      const categoria = await categoriasService.updateCategoria(id, nome, descricao);
      return reply.send({ categoria });
    });

    adminScope.put('/:id/na-home', async (request, reply) => {
      const { id } = request.params as { id: string };
      const { naHome } = naHomeSchema.parse(request.body);
      const categoria = await categoriasService.definirNaHome(id, naHome);
      return reply.send({ categoria });
    });

    adminScope.delete('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      await categoriasService.deleteCategoria(id);
      return reply.code(204).send();
    });
  }, { prefix: '/admin/categorias' });
}
