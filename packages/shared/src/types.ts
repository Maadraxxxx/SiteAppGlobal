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

export type StatusPedido =
  | 'AGUARDANDO_PAGAMENTO'
  | 'PAGO'
  | 'EM_PRODUCAO'
  | 'ENVIADO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export type StatusPagamento = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'CANCELADO';

export interface ItemPedido {
  id: string;
  quantidade: number;
  precoUnitario: string;
  produto: Produto | null;
}

export interface Pagamento {
  id: string;
  metodo: 'PIX' | 'CARTAO';
  status: StatusPagamento;
  valor: string;
  qrCodeBase64: string | null;
  qrCodeCopiaCola: string | null;
  createdAt: string;
}

export interface Pedido {
  id: string;
  status: StatusPedido;
  /** soma dos itens, sem frete */
  subtotal: string;
  /** subtotal + frete — é o que vai pra cobrança */
  total: string;
  cepDestino: string | null;
  freteValor: string | null;
  freteServico: string | null;
  freteTransportadora: string | null;
  fretePrazoDias: number | null;
  createdAt: string;
  itens: ItemPedido[];
  pagamentos: Pagamento[];
  usuario: { id: string; nome: string; email: string };
}

export interface OpcaoFrete {
  id: number;
  nome: string;
  transportadora: string;
  preco: number;
  prazoDias: number;
}

export interface Endereco {
  id: string;
  apelido: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  principal: boolean;
}

export type EnderecoInput = Omit<Endereco, 'id' | 'principal'> & { principal?: boolean };

/** Retorno do ViaCEP, usado pra preencher o formulário sozinho. */
export interface EnderecoPorCep {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    issues?: unknown;
  };
}
