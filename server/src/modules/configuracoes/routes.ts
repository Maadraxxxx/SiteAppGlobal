import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import * as configuracoesService from './service';

const configuracaoSchema = z.object({
  // Nulo é uma escolha, não ausência: significa "volta pro vídeo embutido no
  // app". Por isso nullable e optional andam juntos aqui.
  introVideoUrl: z.string().url().nullable().optional(),
  introVideoAtivo: z.boolean().optional(),
});

export default async function configuracoesRoutes(app: FastifyInstance) {
  // Pública: o app lê isso na abertura, antes de qualquer login.
  app.get('/configuracoes', async (_request, reply) => {
    const configuracao = await configuracoesService.getConfiguracao();
    return reply.send({ configuracao });
  });

  app.register(
    async (adminScope) => {
      adminScope.addHook('preHandler', authenticate);
      adminScope.addHook('preHandler', requireAdmin);

      adminScope.put('/', async (request, reply) => {
        const input = configuracaoSchema.parse(request.body);
        const configuracao = await configuracoesService.atualizarConfiguracao(input);
        return reply.send({ configuracao });
      });
    },
    { prefix: '/admin/configuracoes' },
  );
}
