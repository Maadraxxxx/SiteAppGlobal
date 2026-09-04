import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verificarIdToken } from '../../lib/google-auth';
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

const updatePerfilSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
});

const googleSchema = z.object({ idToken: z.string().min(20) });

// senhaAtual vazia e permitida: conta criada pelo Google ainda nao tem senha.
const updateSenhaSchema = z.object({
  senhaAtual: z.string().default(''),
  novaSenha: z.string().min(6),
});

const esqueciSenhaSchema = z.object({ email: z.string().email() });
const redefinirSenhaSchema = z.object({
  token: z.string().min(20),
  senha: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres'),
});

export default async function authRoutes(app: FastifyInstance) {
  /**
   * Sempre responde 200, exista o e-mail ou nao. Distinguir os dois casos
   * entregaria a qualquer um a lista de quem tem conta na loja.
   */
  app.post('/esqueci-senha', async (request, reply) => {
    const { email } = esqueciSenhaSchema.parse(request.body);

    try {
      await authService.pedirRecuperacao(email);
    } catch (erro) {
      // Falha de envio fica no log do servidor: contar ao cliente que "o
      // e-mail nao saiu" tambem revelaria que a conta existe.
      //
      // A mensagem vai extraida, e nao o objeto: o logger serializa Error como
      // {} e o motivo da falha se perdia justamente quando era preciso.
      request.log.error(
        { motivo: erro instanceof Error ? erro.message : String(erro) },
        'Falha ao enviar e-mail de recuperacao',
      );
    }

    return reply.send({
      mensagem: 'Se existir uma conta com esse e-mail, o link de recuperação já está a caminho.',
    });
  });

  app.post('/redefinir-senha', async (request, reply) => {
    const { token, senha } = redefinirSenhaSchema.parse(request.body);
    await authService.redefinirSenha(token, senha);
    return reply.send({ mensagem: 'Senha alterada. Você já pode entrar com ela.' });
  });

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

  app.post('/google', async (request, reply) => {
    const { idToken } = googleSchema.parse(request.body);
    const perfil = await verificarIdToken(idToken);
    const usuario = await authService.loginComGoogle(perfil);
    const token = app.jwt.sign({ sub: usuario.id, role: usuario.role });
    return reply.send({ token, usuario: authService.toPublicUsuario(usuario) });
  });

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const usuario = await authService.findUsuarioById(request.user.sub);
    return reply.send({ usuario: authService.toPublicUsuario(usuario) });
  });

  app.put('/me', { preHandler: authenticate }, async (request, reply) => {
    const { nome, email } = updatePerfilSchema.parse(request.body);
    const usuario = await authService.updatePerfil(request.user.sub, nome, email);
    return reply.send({ usuario: authService.toPublicUsuario(usuario) });
  });

  app.put('/me/senha', { preHandler: authenticate }, async (request, reply) => {
    const { senhaAtual, novaSenha } = updateSenhaSchema.parse(request.body);
    await authService.updateSenha(request.user.sub, senhaAtual, novaSenha);
    return reply.code(204).send();
  });
}
