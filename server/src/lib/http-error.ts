export class HttpError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const notFound = (message = 'Recurso nao encontrado') => new HttpError(404, 'NOT_FOUND', message);
export const badRequest = (message: string) => new HttpError(400, 'BAD_REQUEST', message);
export const conflict = (message: string) => new HttpError(409, 'CONFLICT', message);
export const unauthorized = (message = 'Nao autenticado') => new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Sem permissao') => new HttpError(403, 'FORBIDDEN', message);

// remove diacritics (accents) so slugs stay plain ASCII
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
