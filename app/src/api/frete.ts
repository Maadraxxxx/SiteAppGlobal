import type { OpcaoFrete } from '@global-decora/shared';
import { apiRequest } from './client';

export interface ItemFrete {
  produtoId: string;
  quantidade: number;
}

export const freteApi = {
  cotar: (cep: string, itens: ItemFrete[]) =>
    apiRequest<{ opcoes: OpcaoFrete[] }>('/frete/cotar', { method: 'POST', body: { cep, itens } }),
};
