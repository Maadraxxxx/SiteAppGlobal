import type { ApiError } from '@global-decora/shared';
import { tokenStorage } from '@/lib/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333/api';

export class ApiRequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await tokenStorage.get();
  const headers: Record<string, string> = {};
  // So declara JSON quando existe corpo: o Fastify recusa com 500
  // (FST_ERR_CTP_EMPTY_JSON_BODY) uma requisicao que diz ser application/json
  // e vem vazia — era o que quebrava todo DELETE do app.
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    const err = data as ApiError | undefined;
    throw new ApiRequestError(
      response.status,
      err?.error?.code ?? 'UNKNOWN',
      err?.error?.message ?? 'Erro inesperado, tente novamente.',
    );
  }

  return data as T;
}
