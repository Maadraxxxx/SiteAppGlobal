import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { badRequest } from './http-error';

const API = 'https://api.mercadopago.com';

function assertConfigured() {
  if (!env.MP_ACCESS_TOKEN) {
    throw badRequest('Pagamento ainda nao configurado — falta MP_ACCESS_TOKEN no servidor.');
  }
}

async function mpFetch(path: string, init?: RequestInit & { idempotencyKey?: string }) {
  assertConfigured();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
  // O MP exige chave de idempotencia em POST de pagamento: sem ela, um retry
  // de rede pode cobrar o cliente duas vezes.
  if (init?.idempotencyKey) headers['X-Idempotency-Key'] = init.idempotencyKey;

  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  const texto = await res.text();
  const corpo = texto ? JSON.parse(texto) : undefined;

  if (!res.ok) {
    const detalhe = corpo?.message ?? corpo?.error ?? texto;
    throw new Error(`Mercado Pago respondeu ${res.status}: ${detalhe}`);
  }

  return corpo;
}

/** Status do MP -> status do nosso Pagamento. */
export function traduzirStatus(status: string) {
  switch (status) {
    case 'approved':
      return 'APROVADO' as const;
    case 'rejected':
      return 'REJEITADO' as const;
    case 'cancelled':
    case 'refunded':
    case 'charged_back':
      return 'CANCELADO' as const;
    default:
      // pending, in_process, authorized...
      return 'PENDENTE' as const;
  }
}

export interface PagamentoPixCriado {
  mercadoPagoPaymentId: string;
  status: ReturnType<typeof traduzirStatus>;
  qrCodeBase64?: string;
  qrCodeCopiaCola?: string;
  expiraEm?: string;
}

export async function criarPagamentoPix(params: {
  valor: number;
  descricao: string;
  emailPagador: string;
  nomePagador: string;
  referencia: string;
}): Promise<PagamentoPixCriado> {
  const [nome, ...resto] = params.nomePagador.trim().split(/\s+/);

  const corpo = await mpFetch('/v1/payments', {
    method: 'POST',
    idempotencyKey: randomUUID(),
    body: JSON.stringify({
      transaction_amount: Number(params.valor.toFixed(2)),
      description: params.descricao,
      payment_method_id: 'pix',
      external_reference: params.referencia,
      payer: {
        email: params.emailPagador,
        first_name: nome,
        last_name: resto.join(' ') || undefined,
      },
    }),
  });

  const pix = corpo?.point_of_interaction?.transaction_data;

  return {
    mercadoPagoPaymentId: String(corpo.id),
    status: traduzirStatus(corpo.status),
    qrCodeBase64: pix?.qr_code_base64,
    qrCodeCopiaCola: pix?.qr_code,
    expiraEm: corpo?.date_of_expiration,
  };
}

export async function consultarPagamento(mercadoPagoPaymentId: string) {
  const corpo = await mpFetch(`/v1/payments/${mercadoPagoPaymentId}`);
  return { status: traduzirStatus(corpo.status), statusOriginal: corpo.status as string };
}
