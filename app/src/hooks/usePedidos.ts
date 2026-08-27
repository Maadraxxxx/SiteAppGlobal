import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  pedidosApi,
  type FreteEscolhido,
  type ItemEntrada,
  type MudancaStatus,
} from '@/api/pedidos';

export function useResumoPedidosMes() {
  return useQuery({ queryKey: ['resumo-pedidos-mes'], queryFn: () => pedidosApi.resumoMes() });
}

export function usePainelFinanceiro() {
  return useQuery({ queryKey: ['painel-financeiro'], queryFn: () => pedidosApi.financeiro() });
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
    mutationFn: ({ itens, frete }: { itens: ItemEntrada[]; frete?: FreteEscolhido }) =>
      pedidosApi.criar(itens, frete),
    onSuccess: invalidate,
  });
}

export function useAtualizarStatusPedido() {
  const invalidate = useInvalidatePedidos();
  return useMutation({
    mutationFn: ({ id, ...mudanca }: { id: string } & MudancaStatus) =>
      pedidosApi.atualizarStatus(id, mudanca),
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
