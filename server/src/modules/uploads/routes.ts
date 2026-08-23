import type { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { badRequest } from '../../lib/http-error';
import { uploadProdutoImagem } from '../../lib/supabase-storage';

const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export default async function uploadsRoutes(app: FastifyInstance) {
  app.register(
    async (adminScope) => {
      adminScope.addHook('preHandler', authenticate);
      adminScope.addHook('preHandler', requireAdmin);

      adminScope.post('/', async (request, reply) => {
        const file = await request.file();
        if (!file) throw badRequest('Nenhum arquivo enviado');
        if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
          throw badRequest('Formato de imagem nao suportado (use JPEG, PNG, WEBP ou GIF)');
        }

        const buffer = await file.toBuffer();
        if (file.file.truncated) {
          throw badRequest('Imagem muito grande (limite de 15MB)');
        }

        const url = await uploadProdutoImagem(buffer, file.filename, file.mimetype);
        return reply.code(201).send({ url });
      });
    },
    { prefix: '/admin/uploads' },
  );
}
