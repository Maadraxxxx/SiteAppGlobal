import type { ProdutoInput } from '@global-decora/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { produtosApi, type ProdutoFilters } from '@/api/produtos';

export function useProdutos(filters?: ProdutoFilters) {
  return useQuery({ queryKey: ['produtos', filters], queryFn: () => produtosApi.list(filters) });
}

/**
 * Quantos produtos vem por vez na rolagem do catalogo. Mandado de proposito em
 * vez de deixar o servidor decidir: o rodape do catalogo depende de saber o
 * tamanho do lote, e um padrao mudado la quebraria ele em silencio.
 */
export const PRODUTOS_POR_LOTE = 20;

/**
 * Catalogo em lotes. Traz uma pagina por vez e so busca a seguinte quando a
 * rolagem chega perto do fim — carregar o catalogo inteiro de uma vez faria o
 * aparelho montar centenas de cards que ninguem vai olhar.
 */
export function useProdutosInfinitos(filters?: ProdutoFilters) {
  return useInfiniteQuery({
    queryKey: ['produtos-infinitos', filters, PRODUTOS_POR_LOTE],
    queryFn: ({ pageParam }) =>
      produtosApi.list({ ...filters, page: pageParam, pageSize: PRODUTOS_POR_LOTE }),
    initialPageParam: 1,
    // Sem proxima pagina, o react-query desliga o fetchNextPage sozinho.
    getNextPageParam: (ultima) =>
      ultima.page * ultima.pageSize < ultima.total ? ultima.page + 1 : undefined,
    // Revalidar uma lista infinita refaz TODAS as paginas ja carregadas de uma
    // vez. Quem rolou ate a decima e volta pro app dispararia dez buscas
    // juntas. Um minuto de validade corta isso sem deixar o catalogo velho.
    staleTime: 60_000,
  });
}

export function useMaisVendidos(limite = 8) {
  return useQuery({
    queryKey: ['mais-vendidos', limite],
    queryFn: () => produtosApi.maisVendidos(limite),
  });
}

export function useProduto(id: string | undefined) {
  return useQuery({
    queryKey: ['produto', id],
    queryFn: () => produtosApi.get(id as string),
    enabled: !!id,
  });
}

export function useAdminProdutos(filters?: ProdutoFilters) {
  return useQuery({
    queryKey: ['admin-produtos', filters],
    queryFn: () => produtosApi.adminList(filters),
  });
}

export function useAdminProduto(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-produto', id],
    queryFn: () => produtosApi.adminGet(id as string),
    enabled: !!id,
  });
}

function useInvalidateProdutos() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['produtos'] });
    qc.invalidateQueries({ queryKey: ['admin-produtos'] });
  };
}

export function useCreateProduto() {
  const invalidate = useInvalidateProdutos();
  return useMutation({
    mutationFn: (input: ProdutoInput) => produtosApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateProduto() {
  const invalidate = useInvalidateProdutos();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProdutoInput }) => produtosApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDesativarProduto() {
  const invalidate = useInvalidateProdutos();
  return useMutation({
    mutationFn: (id: string) => produtosApi.desativar(id),
    onSuccess: invalidate,
  });
}

export function useReativarProduto() {
  const invalidate = useInvalidateProdutos();
  return useMutation({
    mutationFn: (id: string) => produtosApi.reativar(id),
    onSuccess: invalidate,
  });
}
