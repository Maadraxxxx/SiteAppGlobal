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
  comprimento?: string | null; // cm
  largura?: string | null; // cm
  altura?: string | null; // cm
  peso?: string | null; // kg
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
  comprimento?: number;
  largura?: number;
  altura?: number;
  peso?: number;
  imagemUrl?: string;
  categoriaId: string;
  formatoId: string;
  estiloId: string;
}

export interface Banner {
  id: string;
  imagemUrl: string;
  ordem: number;
  ativo: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Numeros do mes corrente para o painel admin. `arrecadado` vem como string
 * porque e Decimal no banco — converter pra number perderia centavos. */
export interface ResumoPedidosMes {
  quantidade: number;
  arrecadado: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    issues?: unknown;
  };
}
