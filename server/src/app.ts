import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env';
import { HttpError } from './lib/http-error';
import authRoutes from './modules/auth/routes';
import bannersRoutes from './modules/banners/routes';
import categoriasRoutes from './modules/categorias/routes';
import estilosRoutes from './modules/estilos/routes';
import formatosRoutes from './modules/formatos/routes';
import pagamentosRoutes from './modules/pagamentos/routes';
import pedidosRoutes from './modules/pedidos/routes';
import produtosRoutes from './modules/produtos/routes';
import uploadsRoutes from './modules/uploads/routes';

export function buildApp() {
  // bodyLimit padrao do Fastify e 1MB pra qualquer requisicao — precisa ser
  // maior que o limite de arquivo do multipart abaixo, senao fotos de celular
  // (facilmente 2-8MB) quebram antes mesmo de chegar na validacao da rota.
  const app = Fastify({ logger: true, bodyLimit: 20 * 1024 * 1024 });

  app.register(cors, { origin: true });
  app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: env.JWT_EXPIRES_IN } });
  app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024 } });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
    }
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Dados invalidos', issues: error.flatten() },
      });
    }
    app.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno' } });
  });

  app.get('/health', async () => ({ ok: true }));

  app.register(
    async (api) => {
      api.register(authRoutes, { prefix: '/auth' });
      api.register(bannersRoutes);
      api.register(categoriasRoutes);
      api.register(formatosRoutes);
      api.register(estilosRoutes);
      api.register(pagamentosRoutes);
      api.register(pedidosRoutes);
      api.register(produtosRoutes);
      api.register(uploadsRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}
