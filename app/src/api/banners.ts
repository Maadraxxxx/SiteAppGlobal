import type { Banner } from '@global-decora/shared';
import { apiRequest } from './client';

export const bannersApi = {
  list: () => apiRequest<{ items: Banner[] }>('/banners'),
  adminList: () => apiRequest<{ items: Banner[] }>('/admin/banners'),
  create: (imagemUrl: string) =>
    apiRequest<{ banner: Banner }>('/admin/banners', { method: 'POST', body: { imagemUrl } }),
  remove: (id: string) => apiRequest<void>(`/admin/banners/${id}`, { method: 'DELETE' }),
};
