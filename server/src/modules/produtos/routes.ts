import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { gerarImagemComTema } from '../../lib/openai-image';
import * as iaService from '../ia/service';
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

  // Vitrine de "Destaques" da tela inicial. Rota propria porque a ordem sai de
  // uma contagem de vendas, nao de um filtro da listagem normal.
  app.get('/produtos/mais-vendidos', async (request, reply) => {
    const { limite } = request.query as { limite?: string };
    const quantidade = Math.min(Math.max(Number(limite) || 8, 1), 20);
    const resultado = await produtosService.maisVendidos(quantidade);
    return reply.send(resultado);
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
      const usuarioId = request.user.sub;

      const produto = await produtosService.getProduto(id);
      if (!produto.imagemUrl) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: 'Produto nao tem imagem para adaptar' } });
      }

      // Cobra a cota (ou um credito) antes de chamar a IA: gerar primeiro e
      // cobrar depois deixaria o cliente gerar de graca se a cobranca falhasse.
      const { paga } = await iaService.reservarGeracao(usuarioId);

      let imagemUrl: string;
      try {
        imagemUrl = await gerarImagemComTema(produto.imagemUrl, tema);
      } catch (erro) {
        // Falhou depois de descontar: devolve o credito, senao o cliente paga
        // por uma imagem que nunca recebeu.
        if (paga) await iaService.estornarGeracao(usuarioId);
        throw erro;
      }

      const geracao = await iaService.registrarGeracao({
        usuarioId,
        produtoId: produto.id,
        tema,
        imagemUrl,
        paga,
      });

      const saldo = await iaService.saldo(usuarioId);
      return reply.send({ geracaoId: geracao.id, imagemUrl, saldo });
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
