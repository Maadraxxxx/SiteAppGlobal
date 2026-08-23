// Tipos compartilhados entre app/ e server/ — refletem o formato JSON retornado pela API.
// Este pacote nao tem codigo em runtime, so tipos (apagados na build de ambos os lados).

export type Role = 'CLIENTE' | 'ADMIN';
export type TamanhoKit = 'P' | 'M' | 'G';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Role;
}

export interface Tag {
  id: string;
  nome: string;
  slug: string;
}

export type Formato = Tag;
export type Estilo = Tag;

export interface Categoria {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string | null;
  preco: string; // Prisma Decimal serializa como string no JSON
  medidas?: string | null;
  peso?: string | null;
  imagemUrl?: string | null;
  ativo: boolean;
  categoriaId: string;
  formatoId: string;
  estiloId: string;
  categoria?: Categoria;
  formato?: Formato;
  estilo?: Estilo;
}

export interface ProdutoInput {
  nome: string;
  descricao?: string;
  preco: number;
  medidas?: string;
  peso?: number;
  imagemUrl?: string;
  categoriaId: string;
  formatoId: string;
  estiloId: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    issues?: unknown;
  };
}
