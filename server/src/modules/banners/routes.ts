import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import * as bannersService from './service';

const createSchema = z.object({ imagemUrl: z.string().url() });

export default async function bannersRoutes(app: FastifyInstance) {
  app.get('/banners', async (_request, reply) => {
    const items = await bannersService.listBannersAtivos();
    return reply.send({ items });
  });

  app.register(
    async (adminScope) => {
      adminScope.addHook('preHandler', authenticate);
      adminScope.addHook('preHandler', requireAdmin);

      adminScope.get('/', async (_request, reply) => {
        const items = await bannersService.listBannersAdmin();
        return reply.send({ items });
      });

      adminScope.post('/', async (request, reply) => {
        const { imagemUrl } = createSchema.parse(request.body);
        const banner = await bannersService.createBanner(imagemUrl);
        return reply.code(201).send({ banner });
      });

      adminScope.delete('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        await bannersService.removeBanner(id);
        return reply.code(204).send();
      });
    },
    { prefix: '/admin/banners' },
  );
}
