import type { Usuario } from '@global-decora/shared';
import { apiRequest } from './client';

interface AuthResponse {
  token: string;
  usuario: Usuario;
}

export const authApi = {
  login: (email: string, senha: string) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: { email, senha } }),

  register: (nome: string, email: string, senha: string) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: { nome, email, senha } }),

  me: () => apiRequest<{ usuario: Usuario }>('/auth/me'),
};
