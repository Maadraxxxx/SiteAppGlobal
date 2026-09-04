import type { Chamado, StatusChamado } from '@global-decora/shared';
import { apiRequest } from './client';

interface ListaChamados {
  items: Chamado[];
  total: number;
}

/** A lista do admin traz também quantos esperam resposta da loja. */
interface ListaAdmin extends ListaChamados {
  abertos: number;
}

export const chamadosApi = {
  meus: () => apiRequest<ListaChamados>('/chamados'),

  obter: (id: string) => apiRequest<{ chamado: Chamado }>(`/chamados/${id}`),

  abrir: (assunto: string, mensagem: string, pedidoId?: string) =>
    apiRequest<{ chamado: Chamado }>('/chamados', {
      method: 'POST',
      body: { assunto, mensagem, pedidoId },
    }),

  responder: (id: string, texto: string) =>
    apiRequest<{ chamado: Chamado }>(`/chamados/${id}/mensagens`, {
      method: 'POST',
      body: { texto },
    }),

  adminList: (status?: StatusChamado) =>
    apiRequest<ListaAdmin>(`/admin/chamados${status ? `?status=${status}` : ''}`),

  adminObter: (id: string) => apiRequest<{ chamado: Chamado }>(`/admin/chamados/${id}`),

  adminResponder: (id: string, texto: string) =>
    apiRequest<{ chamado: Chamado }>(`/admin/chamados/${id}/mensagens`, {
      method: 'POST',
      body: { texto },
    }),

  adminStatus: (id: string, status: StatusChamado) =>
    apiRequest<{ chamado: Chamado }>(`/admin/chamados/${id}/status`, {
      method: 'PUT',
      body: { status },
    }),
};
