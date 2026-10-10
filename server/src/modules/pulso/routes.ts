import type { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma';

/**
 * Mantem o banco acordado.
 *
 * O plano gratuito da Supabase pausa o projeto depois de 7 dias sem uso, e
 * pausado a loja inteira cai — toda rota responde 500 ate alguem religar pelo
 * painel. Ja aconteceu duas vezes. A Vercel chama esta rota uma vez por dia
 * (ver "crons" no vercel.json), o que conta como uso.
 *
 * Le uma tabela de verdade em vez de um `SELECT 1`: e a mesma consulta barata,
 * e nao deixa margem pra duvida sobre o que a Supabase considera atividade.
 *
 * Fica aberta de proposito. Nao devolve nada alem de uma contagem que o
 * catalogo publico ja mostra, e proteger exigiria um segredo a mais na Vercel
 * so pra guardar uma leitura que qualquer visitante ja faz.
 */
export default async function pulsoRoutes(app: FastifyInstance) {
  app.get('/pulso', async (_request, reply) => {
    const categorias = await prisma.categoria.count();
    return reply.send({ ok: true, categorias, em: new Date().toISOString() });
  });
}
