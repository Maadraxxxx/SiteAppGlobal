import type { Categoria, Estilo, Formato } from '@global-decora/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriasApi, estilosApi, formatosApi } from '@/api/tags';

export function useCategorias() {
  return useQuery({ queryKey: ['categorias'], queryFn: () => categoriasApi.list() });
}

export function useCategoria(id: string | undefined) {
  return useQuery({
    queryKey: ['categoria', id],
    queryFn: () => categoriasApi.get(id as string),
    enabled: !!id,
  });
}

export function useCreateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nome, descricao }: { nome: string; descricao?: string }) =>
      categoriasApi.create(nome, descricao),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  });
}

export function useUpdateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nome, descricao }: { id: string; nome: string; descricao?: string }) =>
      categoriasApi.update(id, nome, descricao),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  });
}

export function useRemoveCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriasApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  });
}

function makeTagHooks(api: typeof formatosApi, key: string) {
  function useList() {
    return useQuery({ queryKey: [key], queryFn: () => api.list() });
  }

  function useCreate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (nome: string) => api.create(nome),
      onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
    });
  }

  function useUpdate() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, nome }: { id: string; nome: string }) => api.update(id, nome),
      onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
    });
  }

  function useRemove() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: (id: string) => api.remove(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
    });
  }

  return { useList, useCreate, useUpdate, useRemove };
}

export const formatosHooks = makeTagHooks(formatosApi, 'formatos');
export const estilosHooks = makeTagHooks(estilosApi, 'estilos');

export type { Categoria, Estilo, Formato };
