import type { PaginatedResult, Produto, ProdutoInput, SaldoIA } from '@global-decora/shared';
import { apiRequest } from './client';

export interface ProdutoFilters {
  categoria?: string;
  formato?: string;
  estilo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

function toQuery(filters: ProdutoFilters = {}) {
  const params = new URLSearchParams();
  if (filters.categoria) params.set('categoria', filters.categoria);
  if (filters.formato) params.set('formato', filters.formato);
  if (filters.estilo) params.set('estilo', filters.estilo);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const produtosApi = {
  list: (filters?: ProdutoFilters) =>
    apiRequest<PaginatedResult<Produto>>(`/produtos${toQuery(filters)}`),

  get: (id: string) => apiRequest<{ produto: Produto }>(`/produtos/${id}`),

  /** Vitrine de Destaques: ranking de vendas, completado com os mais novos. */
  maisVendidos: (limite = 8) =>
    apiRequest<{ items: Produto[]; total: number }>(`/produtos/mais-vendidos?limite=${limite}`),

  adminList: (filters?: ProdutoFilters) =>
    apiRequest<PaginatedResult<Produto>>(`/admin/produtos${toQuery(filters)}`),

  adminGet: (id: string) => apiRequest<{ produto: Produto }>(`/admin/produtos/${id}`),

  create: (input: ProdutoInput) =>
    apiRequest<{ produto: Produto }>('/admin/produtos', { method: 'POST', body: input }),

  update: (id: string, input: ProdutoInput) =>
    apiRequest<{ produto: Produto }>(`/admin/produtos/${id}`, { method: 'PUT', body: input }),

  desativar: (id: string) => apiRequest<void>(`/admin/produtos/${id}`, { method: 'DELETE' }),

  reativar: (id: string) =>
    apiRequest<{ produto: Produto }>(`/admin/produtos/${id}/reativar`, { method: 'POST' }),

  gerarImagemIA: (id: string, tema: string) =>
    apiRequest<{ geracaoId: string; imagemUrl: string; saldo: SaldoIA }>(`/produtos/${id}/gerar-imagem-ia`, {
      method: 'POST',
      body: { tema },
    }),
};
