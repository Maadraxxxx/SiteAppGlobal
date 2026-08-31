import type { Categoria, Estilo, Formato } from '@global-decora/shared';
import { apiRequest } from './client';

function makeTagApi(basePath: string) {
  return {
    list: () => apiRequest<{ items: Array<Formato | Estilo> }>(basePath),
    create: (nome: string) =>
      apiRequest<{ item: Formato | Estilo }>(`/admin${basePath}`, { method: 'POST', body: { nome } }),
    update: (id: string, nome: string) =>
      apiRequest<{ item: Formato | Estilo }>(`/admin${basePath}/${id}`, { method: 'PUT', body: { nome } }),
    remove: (id: string) => apiRequest<void>(`/admin${basePath}/${id}`, { method: 'DELETE' }),
  };
}

export const formatosApi = makeTagApi('/formatos');
export const estilosApi = makeTagApi('/estilos');

export const categoriasApi = {
  list: () => apiRequest<{ items: Categoria[] }>('/categorias'),
  get: (id: string) => apiRequest<{ categoria: Categoria }>(`/categorias/${id}`),
  create: (nome: string, descricao?: string) =>
    apiRequest<{ categoria: Categoria }>('/admin/categorias', { method: 'POST', body: { nome, descricao } }),
  update: (id: string, nome: string, descricao?: string) =>
    apiRequest<{ categoria: Categoria }>(`/admin/categorias/${id}`, { method: 'PUT', body: { nome, descricao } }),
  remove: (id: string) => apiRequest<void>(`/admin/categorias/${id}`, { method: 'DELETE' }),

  definirNaHome: (id: string, naHome: boolean) =>
    apiRequest<{ categoria: Categoria }>(`/admin/categorias/${id}/na-home`, {
      method: 'PUT',
      body: { naHome },
    }),
};
