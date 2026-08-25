import type { Pedido, Rastreio } from '@global-decora/shared';
import { apiRequest } from './client';

export const envioApi = {
  /** Cliente acompanhando o próprio pedido. */
  rastreio: (pedidoId: string) => apiRequest<{ rastreio: Rastreio }>(`/pedidos/${pedidoId}/rastreio`),

  adminRastreio: (pedidoId: string) =>
    apiRequest<{ rastreio: Rastreio }>(`/admin/pedidos/${pedidoId}/rastreio`),

  gerarEtiqueta: (pedidoId: string) =>
    apiRequest<{ pedido: Pedido }>(`/admin/pedidos/${pedidoId}/etiqueta`, { method: 'POST' }),

  definirRastreio: (pedidoId: string, codigo: string) =>
    apiRequest<{ pedido: Pedido }>(`/admin/pedidos/${pedidoId}/rastreio`, {
      method: 'PUT',
      body: { codigo },
    }),
};

/**
 * Supabase Storage devolve `Content-Disposition: attachment` quando a URL leva
 * `?download=nome` — então basta abrir o link pra virar download de verdade,
 * sem passar pelo nosso servidor.
 */
export function urlDeDownload(imagemUrl: string, nomeArquivo: string) {
  const extensao = imagemUrl.split('.').pop()?.split('?')[0] ?? 'png';
  const nome = nomeArquivo.replace(/[^\w\-.]+/g, '-').slice(0, 60);
  return `${imagemUrl}?download=${nome}.${extensao}`;
}
