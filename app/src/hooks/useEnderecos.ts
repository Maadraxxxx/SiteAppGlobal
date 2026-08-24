import type { EnderecoInput } from '@global-decora/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enderecosApi } from '@/api/enderecos';

export function useEnderecos() {
  return useQuery({ queryKey: ['enderecos'], queryFn: () => enderecosApi.list() });
}

function useInvalidateEnderecos() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['enderecos'] });
}

export function useCriarEndereco() {
  const invalidate = useInvalidateEnderecos();
  return useMutation({ mutationFn: (input: EnderecoInput) => enderecosApi.criar(input), onSuccess: invalidate });
}

export function useAtualizarEndereco() {
  const invalidate = useInvalidateEnderecos();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: EnderecoInput }) => enderecosApi.atualizar(id, input),
    onSuccess: invalidate,
  });
}

export function useRemoverEndereco() {
  const invalidate = useInvalidateEnderecos();
  return useMutation({ mutationFn: (id: string) => enderecosApi.remover(id), onSuccess: invalidate });
}
