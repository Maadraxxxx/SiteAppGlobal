import type { StatusPedido } from '@global-decora/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pedidosApi, type ItemEntrada } from '@/api/pedidos';

export function useResumoPedidosMes() {
  return useQuery({ queryKey: ['resumo-pedidos-mes'], queryFn: () => pedidosApi.resumoMes() });
}

export function useMeusPedidos() {
  return useQuery({ queryKey: ['meus-pedidos'], queryFn: () => pedidosApi.listarMeus() });
}

export function usePedido(id: string | undefined) {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: () => pedidosApi.get(id as string),
    enabled: !!id,
  });
}

export function useAdminPedidos() {
  return useQuery({ queryKey: ['admin-pedidos'], queryFn: () => pedidosApi.adminList() });
}

function useInvalidatePedidos() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['meus-pedidos'] });
    qc.invalidateQueries({ queryKey: ['admin-pedidos'] });
    qc.invalidateQueries({ queryKey: ['resumo-pedidos-mes'] });
  };
}

export function useCriarPedido() {
  const invalidate = useInvalidatePedidos();
  return useMutation({
    mutationFn: (itens: ItemEntrada[]) => pedidosApi.criar(itens),
    onSuccess: invalidate,
  });
}

export function useAtualizarStatusPedido() {
  const invalidate = useInvalidatePedidos();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusPedido }) =>
      pedidosApi.atualizarStatus(id, status),
    onSuccess: invalidate,
  });
}

/**
 * Enquanto o cliente olha o QR, o app pergunta ao servidor se o PIX caiu.
 * O webhook do MP tambem atualiza, mas nao da pra contar so com ele: em
 * ambiente local ele nem chega.
 */
export function usePagamentoDoPedido(pedidoId: string | undefined, ativo: boolean) {
  return useQuery({
    queryKey: ['pagamento', pedidoId],
    queryFn: () => pedidosApi.consultarPagamento(pedidoId as string),
    enabled: !!pedidoId && ativo,
    refetchInterval: ativo ? 5000 : false,
  });
}
