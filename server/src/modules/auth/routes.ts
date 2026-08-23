import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import * as authService from './service';

const registerSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const { nome, email, senha } = registerSchema.parse(request.body);
    const usuario = await authService.registerCliente(nome, email, senha);
    const token = app.jwt.sign({ sub: usuario.id, role: usuario.role });
    return reply.code(201).send({ token, usuario: authService.toPublicUsuario(usuario) });
  });

  app.post('/login', async (request, reply) => {
    const { email, senha } = loginSchema.parse(request.body);
    const usuario = await authService.login(email, senha);
    const token = app.jwt.sign({ sub: usuario.id, role: usuario.role });
    return reply.send({ token, usuario: authService.toPublicUsuario(usuario) });
  });

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const usuario = await authService.findUsuarioById(request.user.sub);
    return reply.send({ usuario: authService.toPublicUsuario(usuario) });
  });
}
