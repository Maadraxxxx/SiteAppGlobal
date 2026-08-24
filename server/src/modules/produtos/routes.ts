import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { gerarImagemComTema } from '../../lib/openai-image';
import * as produtosService from './service';

const produtoSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  preco: z.number().nonnegative(),
  comprimento: z.number().nonnegative().optional(),
  largura: z.number().nonnegative().optional(),
  altura: z.number().nonnegative().optional(),
  peso: z.number().nonnegative().optional(),
  imagemUrl: z.string().url().optional().or(z.literal('')),
  categoriaId: z.string().uuid(),
  formatoId: z.string().uuid(),
  estiloId: z.string().uuid(),
});

const listQuerySchema = z.object({
  categoria: z.string().optional(),
  formato: z.string().optional(),
  estilo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
});

export default async function produtosRoutes(app: FastifyInstance) {
  app.get('/produtos', async (request, reply) => {
    const filters = listQuerySchema.parse(request.query);
    const result = await produtosService.listProdutos(filters);
    return reply.send(result);
  });

  app.get('/produtos/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const produto = await produtosService.getProduto(id);
    return reply.send({ produto });
  });

  app.post(
    '/produtos/:id/gerar-imagem-ia',
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { tema } = z.object({ tema: z.string().min(3) }).parse(request.body);
      const produto = await produtosService.getProduto(id);
      if (!produto.imagemUrl) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Produto nao tem imagem para adaptar' } });
      }
      const imagemUrl = await gerarImagemComTema(produto.imagemUrl, tema);
      return reply.send({ imagemUrl });
    },
  );

  app.register(async (adminScope) => {
    adminScope.addHook('preHandler', authenticate);
    adminScope.addHook('preHandler', requireAdmin);

    adminScope.get('/', async (request, reply) => {
      const filters = listQuerySchema.parse(request.query);
      const result = await produtosService.listProdutos({ ...filters, incluirInativos: true });
      return reply.send(result);
    });

    adminScope.get('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const produto = await produtosService.getProduto(id, { incluirInativo: true });
      return reply.send({ produto });
    });

    adminScope.post('/', async (request, reply) => {
      const input = produtoSchema.parse(request.body);
      const produto = await produtosService.createProduto(input);
      return reply.code(201).send({ produto });
    });

    adminScope.put('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = produtoSchema.parse(request.body);
      const produto = await produtosService.updateProduto(id, input);
      return reply.send({ produto });
    });

    // soft delete
    adminScope.delete('/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      await produtosService.setProdutoAtivo(id, false);
      return reply.code(204).send();
    });

    adminScope.post('/:id/reativar', async (request, reply) => {
      const { id } = request.params as { id: string };
      const produto = await produtosService.setProdutoAtivo(id, true);
      return reply.send({ produto });
    });
  }, { prefix: '/admin/produtos' });
}
