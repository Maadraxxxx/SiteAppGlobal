import type {
  Pagamento,
  Pedido,
  ResumoPedidosMes,
  StatusPagamentoPedido,
  StatusProducao,
} from '@global-decora/shared';
import { apiRequest } from './client';

/** Os dois eixos são independentes: manda só o que mudou. */
export interface MudancaStatus {
  statusPagamento?: StatusPagamentoPedido;
  statusProducao?: StatusProducao;
}

export interface ItemEntrada {
  produtoId: string;
  quantidade: number;
}

export interface FreteEscolhido {
  /** endereço salvo do cliente — o servidor pega o CEP dele */
  enderecoId: string;
  servicoId: number;
}

export const pedidosApi = {
  criar: (itens: ItemEntrada[], frete?: FreteEscolhido) =>
    apiRequest<{ pedido: Pedido }>('/pedidos', { method: 'POST', body: { itens, frete } }),

  listarMeus: () => apiRequest<{ items: Pedido[] }>('/pedidos'),

  get: (id: string) => apiRequest<{ pedido: Pedido }>(`/pedidos/${id}`),

  criarPix: (pedidoId: string) =>
    apiRequest<{ pagamento: Pagamento }>(`/pedidos/${pedidoId}/pagamento/pix`, { method: 'POST' }),

  consultarPagamento: (pedidoId: string) =>
    apiRequest<{ pagamento: Pagamento }>(`/pedidos/${pedidoId}/pagamento`),

  resumoMes: () => apiRequest<{ resumo: ResumoPedidosMes }>('/admin/pedidos/resumo-mes'),

  adminList: () => apiRequest<{ items: Pedido[] }>('/admin/pedidos'),

  atualizarStatus: (id: string, mudanca: MudancaStatus) =>
    apiRequest<{ pedido: Pedido }>(`/admin/pedidos/${id}/status`, { method: 'PUT', body: mudanca }),
};
