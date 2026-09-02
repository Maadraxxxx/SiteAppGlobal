import type { ConfiguracaoApp } from '@global-decora/shared';
import { apiRequest } from './client';

export interface EnderecosDeEnvio {
  /** Pra onde o arquivo vai (PUT), direto no armazenamento. */
  urlDeEnvio: string;
  /** Endereço final e público, o que fica salvo na configuração. */
  urlPublica: string;
}

export const configuracoesApi = {
  get: () => apiRequest<{ configuracao: ConfiguracaoApp }>('/configuracoes'),

  atualizar: (input: Partial<ConfiguracaoApp>) =>
    apiRequest<{ configuracao: ConfiguracaoApp }>('/admin/configuracoes', {
      method: 'PUT',
      body: input,
    }),

  /**
   * Autoriza o envio de um arquivo grande direto pro armazenamento, sem passar
   * pelo servidor — que corta o corpo da requisição em poucos megabytes.
   */
  urlDeEnvio: (filename: string) =>
    apiRequest<EnderecosDeEnvio>('/admin/uploads/url-de-envio', {
      method: 'POST',
      body: { filename },
    }),
};
