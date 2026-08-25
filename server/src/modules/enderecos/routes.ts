import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import * as enderecosService from './service';

// nullish (e nao optional) nos campos livres: o app manda null quando o
// cliente deixa em branco, e optional sozinho recusaria null.
const enderecoSchema = z.object({
  apelido: z.string().max(40).nullish(),
  documento: z.string().max(20).nullish(),
  cep: z.string().min(8),
  logradouro: z.string().min(2),
  numero: z.string().min(1),
  complemento: z.string().max(80).nullish(),
  bairro: z.string().min(2),
  cidade: z.string().min(2),
  uf: z.string().length(2),
  principal: z.boolean().optional(),
});

export default async function enderecosRoutes(app: FastifyInstance) {
  // Aberta: serve pra preencher o formulario, nao expoe nada de ninguem.
  app.get('/cep/:cep', async (request, reply) => {
    const { cep } = request.params as { cep: string };
    const endereco = await enderecosService.buscarPorCep(cep);
    return reply.send({ endereco });
  });

  app.register(async (scope) => {
    scope.addHook('preHandler', authenticate);

    scope.get('/enderecos', async (request, reply) => {
      const items = await enderecosService.listar(request.user.sub);
      return reply.send({ items });
    });

    scope.post('/enderecos', async (request, reply) => {
      const entrada = enderecoSchema.parse(request.body);
      const endereco = await enderecosService.criar(request.user.sub, entrada);
      return reply.code(201).send({ endereco });
    });

    scope.put('/enderecos/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const entrada = enderecoSchema.parse(request.body);
      const endereco = await enderecosService.atualizar(id, request.user.sub, entrada);
      return reply.send({ endereco });
    });

    scope.delete('/enderecos/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      await enderecosService.remover(id, request.user.sub);
      return reply.code(204).send();
    });
  });
}
