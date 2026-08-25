import type { CompraCreditoIA, SaldoIA } from '@global-decora/shared';
import { apiRequest } from './client';

export const iaApi = {
  saldo: () => apiRequest<{ saldo: SaldoIA }>('/ia/saldo'),

  comprarCreditos: (quantidade: number) =>
    apiRequest<{ compra: CompraCreditoIA }>('/ia/creditos', { method: 'POST', body: { quantidade } }),

  consultarCompra: (id: string) => apiRequest<{ compra: CompraCreditoIA }>(`/ia/creditos/${id}`),
};
