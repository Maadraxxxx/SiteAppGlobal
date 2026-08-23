// Factory de rotas para os "tag resources" simples (nome + slug): formatos e estilos.
// categorias e produtos tem campos extras / regras proprias e ficam em modulos dedicados.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/auth';
import { conflict, notFound, slugify } from './http-error';

const nomeSchema = z.object({ nome: z.string().min(2) });

interface TagDelegate {
  findMany(args?: unknown): Promise<Array<{ id: string; nome: string; slug: string }>>;
  findUnique(args: unknown): Promise<{ id: string; nome: string; slug: string } | null>;
  create(args: unknown): Promise<{ id: string; nome: string; slug: string }>;
  update(args: unknown): Promise<{ id: string; nome: string; slug: string }>;
  delete(args: unknown): Promise<unknown>;
}

interface TagResourceOptions {
  prefix: string; // ex: '/formatos'
  delegate: TagDelegate;
  produtosEmUso: (id: string) => Promise<number>;
}

export function registerTagResource(app: FastifyInstance, opts: TagResourceOptions) {
  const { delegate, produtosEmUso } = opts;

  // leitura publica
  app.get(opts.prefix, async (_request, reply) => {
    const items = await delegate.findMany({ orderBy: { nome: 'asc' } });
    return reply.send({ items });
  });

  // CRUD admin
  app.register(async (adminScope) => {
    adminScope.addHook('preHandler', authenticate);
    adminScope.addHook('preHandler', requireAdmin);

    adminScope.get('/', async (_request, reply) => {
      const items = await delegate.findMany({ orderBy: { nome: 'asc' } });
      return reply.send({ items });
    });

    adminScope.post('/', async (request, reply) => {
      const { nome } = nomeSchema.parse(request.body);
      const slug = slugify(nome);
      const existing = await delegate.findUnique({ where: { slug } });
      if (existing) throw conflict('Ja existe um registro com esse nome');
      const item = await delegate.create({ data: { nome, slug } });
      return reply.code(201).send({ item });
    });

    adminScope.put('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const { nome } = nomeSchema.parse(request.body);
      const existing = await delegate.findUnique({ where: { id } });
      if (!existing) throw notFound();
      const slug = slugify(nome);
      const item = await delegate.update({ where: { id }, data: { nome, slug } });
      return reply.send({ item });
    });

    adminScope.delete('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const existing = await delegate.findUnique({ where: { id } });
      if (!existing) throw notFound();
      const emUso = await produtosEmUso(id);
      if (emUso > 0) {
        throw conflict(`Ainda em uso por ${emUso} produto(s) — nao pode ser removido`);
      }
      await delegate.delete({ where: { id } });
      return reply.code(204).send();
    });
  }, { prefix: `/admin${opts.prefix}` });
}
