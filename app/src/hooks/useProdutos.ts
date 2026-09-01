import type { ProdutoInput } from '@global-decora/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { produtosApi, type ProdutoFilters } from '@/api/produtos';

export function useProdutos(filters?: ProdutoFilters) {
  return useQuery({ queryKey: ['produtos', filters], queryFn: () => produtosApi.list(filters) });
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
