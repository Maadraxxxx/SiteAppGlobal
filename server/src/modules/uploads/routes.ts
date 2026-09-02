import type { FastifyInstance } from 'fastify';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { badRequest } from '../../lib/http-error';
import { criarUrlDeEnvio, uploadProdutoImagem } from '../../lib/supabase-storage';

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

      /**
       * Autoriza um envio direto pro armazenamento, sem o arquivo passar por
       * aqui. Usado pelo video de abertura: funcao serverless corta o corpo da
       * requisicao em poucos megabytes, e video estoura isso facil.
       */
      adminScope.post('/url-de-envio', async (request, reply) => {
        const { filename } = (request.body ?? {}) as { filename?: string };
        if (!filename) throw badRequest('Informe o nome do arquivo');

        const enderecos = await criarUrlDeEnvio(filename);
        return reply.code(201).send(enderecos);
      });
    },
    { prefix: '/admin/uploads' },
  );
}
