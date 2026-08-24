import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as freteService from './service';

const cotarSchema = z.object({
  cep: z.string().min(8),
  itens: z
    .array(z.object({ produtoId: z.string().uuid(), quantidade: z.number().int().positive() }))
    .min(1),
});

export default async function freteRoutes(app: FastifyInstance) {
  // Publica de proposito: o cliente cota o frete no carrinho, antes de logar.
  app.post('/frete/cotar', async (request, reply) => {
    const { cep, itens } = cotarSchema.parse(request.body);
    const opcoes = await freteService.cotar(cep, itens);
    return reply.send({ opcoes });
  });
}
