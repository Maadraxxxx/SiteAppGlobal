import type { ResumoPedidosMes } from '@global-decora/shared';
import { apiRequest } from './client';

export const pedidosApi = {
  resumoMes: () => apiRequest<{ resumo: ResumoPedidosMes }>('/admin/pedidos/resumo-mes'),
};
