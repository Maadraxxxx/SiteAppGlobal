import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './config/env';
import { HttpError } from './lib/http-error';
import authRoutes from './modules/auth/routes';
import categoriasRoutes from './modules/categorias/routes';
import estilosRoutes from './modules/estilos/routes';
import formatosRoutes from './modules/formatos/routes';
import produtosRoutes from './modules/produtos/routes';

export function buildApp() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });
  app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: env.JWT_EXPIRES_IN } });

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
      api.register(categoriasRoutes);
      api.register(formatosRoutes);
      api.register(estilosRoutes);
      api.register(produtosRoutes);
    },
    { prefix: '/api' },
  );

  return app;
}
