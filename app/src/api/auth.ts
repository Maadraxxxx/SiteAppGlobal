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

  google: (idToken: string) =>
    apiRequest<AuthResponse>('/auth/google', { method: 'POST', body: { idToken } }),

  me: () => apiRequest<{ usuario: Usuario }>('/auth/me'),

  updatePerfil: (nome: string, email: string) =>
    apiRequest<{ usuario: Usuario }>('/auth/me', { method: 'PUT', body: { nome, email } }),

  updateSenha: (senhaAtual: string, novaSenha: string) =>
    apiRequest<void>('/auth/me/senha', { method: 'PUT', body: { senhaAtual, novaSenha } }),

  /** Responde igual exista ou nao a conta — não dá pra descobrir cadastro por aqui. */
  esqueciSenha: (email: string) =>
    apiRequest<{ mensagem: string }>('/auth/esqueci-senha', { method: 'POST', body: { email } }),

  redefinirSenha: (token: string, senha: string) =>
    apiRequest<{ mensagem: string }>('/auth/redefinir-senha', {
      method: 'POST',
      body: { token, senha },
    }),
};
