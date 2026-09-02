import type { ConfiguracaoApp, Role } from '@global-decora/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { configuracoesApi } from '@/api/configuracoes';
import { usuariosApi } from '@/api/usuarios';

/**
 * Ajustes da loja. Lido na abertura do app, antes de qualquer login — é ele
 * que decide se a abertura em vídeo toca e qual vídeo é.
 */
export function useConfiguracao() {
  return useQuery({
    queryKey: ['configuracao'],
    queryFn: () => configuracoesApi.get(),
    // A abertura não pode ficar esperando a rede. Se falhar, o app cai no
    // vídeo embutido e segue — por isso nenhuma tentativa extra aqui.
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAtualizarConfiguracao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<ConfiguracaoApp>) => configuracoesApi.atualizar(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracao'] }),
  });
}

export function useUsuarios(search?: string) {
  return useQuery({
    queryKey: ['usuarios', search],
    queryFn: () => usuariosApi.list(search),
  });
}

export function useDefinirRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => usuariosApi.definirRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}
