import type { StatusChamado } from '@global-decora/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chamadosApi } from '@/api/chamados';

/**
 * Depois de escrever numa conversa, a lista e a própria conversa mudam juntas
 * — o status e a prévia da lista vêm da última mensagem.
 */
function useInvalidarChamados() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['chamados'] });
    qc.invalidateQueries({ queryKey: ['chamado'] });
  };
}

export function useMeusChamados() {
  return useQuery({ queryKey: ['chamados', 'meus'], queryFn: () => chamadosApi.meus() });
}

export function useChamado(id: string | undefined, admin = false) {
  return useQuery({
    queryKey: ['chamado', id, admin],
    queryFn: () => (admin ? chamadosApi.adminObter(id as string) : chamadosApi.obter(id as string)),
    enabled: !!id,
  });
}

export function useAbrirChamado() {
  const invalidar = useInvalidarChamados();
  return useMutation({
    mutationFn: ({
      assunto,
      mensagem,
      pedidoId,
    }: {
      assunto: string;
      mensagem: string;
      pedidoId?: string;
    }) => chamadosApi.abrir(assunto, mensagem, pedidoId),
    onSuccess: invalidar,
  });
}

export function useResponderChamado(admin = false) {
  const invalidar = useInvalidarChamados();
  return useMutation({
    mutationFn: ({ id, texto }: { id: string; texto: string }) =>
      admin ? chamadosApi.adminResponder(id, texto) : chamadosApi.responder(id, texto),
    onSuccess: invalidar,
  });
}

export function useChamadosAdmin(status?: StatusChamado) {
  return useQuery({
    queryKey: ['chamados', 'admin', status],
    queryFn: () => chamadosApi.adminList(status),
  });
}

export function useStatusChamado() {
  const invalidar = useInvalidarChamados();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusChamado }) =>
      chamadosApi.adminStatus(id, status),
    onSuccess: invalidar,
  });
}
