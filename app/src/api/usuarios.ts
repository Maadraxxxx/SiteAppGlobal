import type { PaginatedResult, Role, UsuarioAdmin } from '@global-decora/shared';
import { apiRequest } from './client';

export const usuariosApi = {
  list: (search?: string) =>
    apiRequest<PaginatedResult<UsuarioAdmin>>(
      `/admin/usuarios${search ? `?search=${encodeURIComponent(search)}` : ''}`,
    ),

  definirRole: (id: string, role: Role) =>
    apiRequest<{ usuario: UsuarioAdmin }>(`/admin/usuarios/${id}/role`, {
      method: 'PUT',
      body: { role },
    }),
};
