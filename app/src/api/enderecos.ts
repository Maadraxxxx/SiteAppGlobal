import type { Endereco, EnderecoInput, EnderecoPorCep } from '@global-decora/shared';
import { apiRequest } from './client';

export const enderecosApi = {
  list: () => apiRequest<{ items: Endereco[] }>('/enderecos'),

  criar: (input: EnderecoInput) =>
    apiRequest<{ endereco: Endereco }>('/enderecos', { method: 'POST', body: input }),

  atualizar: (id: string, input: EnderecoInput) =>
    apiRequest<{ endereco: Endereco }>(`/enderecos/${id}`, { method: 'PUT', body: input }),

  remover: (id: string) => apiRequest<void>(`/enderecos/${id}`, { method: 'DELETE' }),

  buscarCep: (cep: string) =>
    apiRequest<{ endereco: EnderecoPorCep }>(`/cep/${cep.replace(/\D/g, '')}`),
};
