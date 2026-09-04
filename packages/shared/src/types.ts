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
  /** Ganha uma vitrine própria na tela inicial, com os produtos dela. */
  naHome: boolean;
}

/** Ajustes da loja que o admin muda pelo painel. */
export interface ConfiguracaoApp {
  /** Vídeo de abertura escolhido pelo admin. Nulo usa o embutido no app. */
  introVideoUrl: string | null;
  /** Desligado, o app abre direto na Home. */
  introVideoAtivo: boolean;
}

/** Pessoa cadastrada, como o painel do admin a enxerga — nunca traz senha. */
export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  createdAt: string;
}

export type StatusChamado = 'ABERTO' | 'RESPONDIDO' | 'RESOLVIDO';
export type AutorMensagem = 'CLIENTE' | 'LOJA';

export interface MensagemChamado {
  id: string;
  autor: AutorMensagem;
  texto: string;
  createdAt: string;
}

/** Uma conversa de suporte entre o cliente e a loja. */
export interface Chamado {
  id: string;
  assunto: string;
  status: StatusChamado;
  /** Pedido a que o chamado se refere, quando o cliente anexou um. */
  pedidoId: string | null;
  createdAt: string;
  updatedAt: string;
  usuario: { id: string; nome: string; email: string };
  mensagens: MensagemChamado[];
  _count: { mensagens: number };
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

/** Dinheiro num recorte de tempo. `receita` é string pelo mesmo motivo acima. */
export interface TotalDoPeriodo {
  pedidos: number;
  receita: string;
}

/**
 * Painel financeiro do admin. Tudo aqui conta só pedido com pagamento PAGO —
 * é dinheiro que entrou. As duas exceções estão no nome: `aReceber` e
 * `cancelados`.
 */
export interface PainelFinanceiro {
  hoje: TotalDoPeriodo;
  semana: TotalDoPeriodo;
  mes: TotalDoPeriodo;
  ano: TotalDoPeriodo;
  aReceber: { pedidos: number; valor: string };
  cancelados: { pedidos: number; valor: string };
  /** Receita do ano dividida pelos pedidos do ano. */
  ticketMedio: string;
  /** Quanto do faturamento é produto e quanto é frete — o frete entra e sai. */
  composicao: { produtos: string; frete: string };
  /** Últimos 12 meses, com os vazios preenchidos pra linha do tempo não pular. */
  porMes: { mes: string; pedidos: number; receita: string }[];
  topProdutos: { nome: string; quantidade: number; receita: string }[];
  porMetodo: { metodo: string; pedidos: number; valor: string }[];
}

/**
 * O pedido tem dois status ao mesmo tempo, e eles andam sozinhos: o do dinheiro
 * (quem mexe é o retorno do Mercado Pago) e o da bancada (quem mexe é o admin).
 * Antes era um só, e estar "em produção" apagava a informação de estar pago.
 */
export type StatusPagamentoPedido = 'AGUARDANDO' | 'PAGO' | 'CANCELADO';

export type StatusProducao = 'AGUARDANDO' | 'EM_PRODUCAO' | 'ENVIADO' | 'ENTREGUE';

export type StatusPagamento = 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'CANCELADO';

export interface GeracaoImagem {
  id: string;
  tema: string;
  imagemUrl: string;
  paga: boolean;
  createdAt: string;
}

/** Quantas gerações o cliente ainda tem hoje e quantos créditos comprados restam. */
export interface SaldoIA {
  gratuitasPorDia: number;
  gratuitasUsadasHoje: number;
  gratuitasRestantes: number;
  creditos: number;
  precoGeracao: number;
  podeGerar: boolean;
}

export interface CompraCreditoIA {
  id: string;
  quantidade: number;
  valor: string;
  status: StatusPagamento;
  qrCodeBase64: string | null;
  qrCodeCopiaCola: string | null;
}

export interface ItemPedido {
  id: string;
  quantidade: number;
  precoUnitario: string;
  produto: Produto | null;
  /** Presente quando o cliente encomendou a versão personalizada pela IA. */
  geracaoImagem: GeracaoImagem | null;
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
  statusPagamento: StatusPagamentoPedido;
  statusProducao: StatusProducao;
  /** soma dos itens, sem frete */
  subtotal: string;
  /** subtotal + frete — é o que vai pra cobrança */
  total: string;
  cepDestino: string | null;
  /** Cópia do endereço no momento da compra — não muda se o cliente editar depois. */
  enderecoLogradouro: string | null;
  enderecoNumero: string | null;
  enderecoComplemento: string | null;
  enderecoBairro: string | null;
  enderecoCidade: string | null;
  enderecoUf: string | null;
  freteValor: string | null;
  freteServico: string | null;
  freteTransportadora: string | null;
  fretePrazoDias: number | null;
  codigoRastreio: string | null;
  urlEtiqueta: string | null;
  melhorEnvioEnvioId: string | null;
  /**
   * Até quando o cliente pode pagar. Vem calculado do servidor, onde mora o
   * prazo. Nulo quando o pedido já saiu de "aguardando pagamento".
   */
  expiraEm?: string | null;
  createdAt: string;
  itens: ItemPedido[];
  pagamentos: Pagamento[];
  usuario: { id: string; nome: string; email: string };
}

export interface EventoRastreio {
  status?: string;
  description?: string;
  created_at?: string;
  location?: string;
}

export interface Rastreio {
  codigoRastreio: string | null;
  transportadora: string | null;
  servico: string | null;
  prazoDias: number | null;
  statusPagamento: StatusPagamentoPedido;
  statusProducao: StatusProducao;
  statusTransportadora?: string;
  eventos: EventoRastreio[];
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
  /** CPF/CNPJ — a transportadora exige na etiqueta. */
  documento: string | null;
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
