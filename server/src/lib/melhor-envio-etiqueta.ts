import { env } from '../config/env';
import { badRequest } from './http-error';
import { apenasDigitos } from './melhor-envio';

const BASE_SANDBOX = 'https://sandbox.melhorenvio.com.br';
const BASE_PRODUCAO = 'https://melhorenvio.com.br';

function base() {
  return env.MELHOR_ENVIO_SANDBOX ? BASE_SANDBOX : BASE_PRODUCAO;
}

/** Campos do remetente que a etiqueta exige — cotar precisa só do CEP. */
const CAMPOS_REMETENTE = [
  'REMETENTE_NOME',
  'REMETENTE_DOCUMENTO',
  'REMETENTE_TELEFONE',
  'REMETENTE_EMAIL',
  'REMETENTE_LOGRADOURO',
  'REMETENTE_NUMERO',
  'REMETENTE_BAIRRO',
  'REMETENTE_CIDADE',
  'REMETENTE_UF',
  'FRETE_CEP_ORIGEM',
] as const;

export function conferirConfiguracao() {
  if (!env.MELHOR_ENVIO_TOKEN) {
    throw badRequest('Etiqueta indisponivel — falta MELHOR_ENVIO_TOKEN no servidor.');
  }
  const faltando = CAMPOS_REMETENTE.filter((campo) => !env[campo]);
  if (faltando.length) {
    throw badRequest(`Etiqueta indisponivel — falta configurar no servidor: ${faltando.join(', ')}.`);
  }
}

async function meFetch(path: string, init?: RequestInit) {
  conferirConfiguracao();

  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.MELHOR_ENVIO_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': `Global Decora (${env.MELHOR_ENVIO_CONTATO})`,
      ...init?.headers,
    },
  });

  const texto = await res.text();
  if (!res.ok) {
    throw new Error(`Melhor Envio respondeu ${res.status}: ${texto.slice(0, 400)}`);
  }
  return texto ? JSON.parse(texto) : undefined;
}

function remetente() {
  return {
    name: env.REMETENTE_NOME,
    phone: apenasDigitos(env.REMETENTE_TELEFONE ?? ''),
    email: env.REMETENTE_EMAIL,
    document: apenasDigitos(env.REMETENTE_DOCUMENTO ?? ''),
    address: env.REMETENTE_LOGRADOURO,
    complement: env.REMETENTE_COMPLEMENTO ?? '',
    number: env.REMETENTE_NUMERO,
    district: env.REMETENTE_BAIRRO,
    city: env.REMETENTE_CIDADE,
    state_abbr: env.REMETENTE_UF,
    country_id: 'BR',
    postal_code: apenasDigitos(env.FRETE_CEP_ORIGEM ?? ''),
  };
}

export interface DestinatarioEtiqueta {
  nome: string;
  email: string;
  documento: string;
  telefone?: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface VolumeEtiqueta {
  nome: string;
  quantidade: number;
  valorUnitario: number;
  comprimento: number;
  largura: number;
  altura: number;
  peso: number;
}

/**
 * Faz o caminho inteiro no Melhor Envio: coloca no carrinho, paga com o saldo
 * da conta, gera e pega o PDF. São quatro chamadas encadeadas — se qualquer
 * uma falhar, o erro sobe com a resposta deles pra dar pra entender o porquê.
 */
export async function comprarEtiqueta(params: {
  servicoId: number;
  destinatario: DestinatarioEtiqueta;
  volumes: VolumeEtiqueta[];
  referencia: string;
}) {
  const total = params.volumes.reduce((s, v) => s + v.valorUnitario * v.quantidade, 0);

  // 1) carrinho
  const item = await meFetch('/api/v2/me/cart', {
    method: 'POST',
    body: JSON.stringify({
      service: params.servicoId,
      from: remetente(),
      to: {
        name: params.destinatario.nome,
        email: params.destinatario.email,
        document: apenasDigitos(params.destinatario.documento),
        phone: apenasDigitos(params.destinatario.telefone ?? ''),
        address: params.destinatario.logradouro,
        complement: params.destinatario.complemento ?? '',
        number: params.destinatario.numero,
        district: params.destinatario.bairro,
        city: params.destinatario.cidade,
        state_abbr: params.destinatario.uf,
        country_id: 'BR',
        postal_code: apenasDigitos(params.destinatario.cep),
      },
      products: params.volumes.map((v) => ({
        name: v.nome,
        quantity: v.quantidade,
        unitary_value: v.valorUnitario,
      })),
      volumes: params.volumes.map((v) => ({
        height: v.altura,
        width: v.largura,
        length: v.comprimento,
        weight: v.peso,
      })),
      options: {
        insurance_value: total,
        receipt: false,
        own_hand: false,
        reverse: false,
        non_commercial: true,
        // Aparece no painel do Melhor Envio, pra casar com o pedido daqui.
        tags: [{ tag: params.referencia }],
      },
    }),
  });

  const envioId: string = item.id;

  // 2) paga com o saldo da conta
  await meFetch('/api/v2/me/shipment/checkout', {
    method: 'POST',
    body: JSON.stringify({ orders: [envioId] }),
  });

  // 3) gera a etiqueta (e aqui que sai o codigo de rastreio)
  await meFetch('/api/v2/me/shipment/generate', {
    method: 'POST',
    body: JSON.stringify({ orders: [envioId] }),
  });

  // 4) link do PDF pra imprimir
  const impressao = await meFetch('/api/v2/me/shipment/print', {
    method: 'POST',
    body: JSON.stringify({ mode: 'private', orders: [envioId] }),
  });

  const info = await meFetch(`/api/v2/me/shipment/generate/${envioId}`).catch(() => undefined);

  return {
    envioId,
    urlEtiqueta: impressao?.url as string | undefined,
    codigoRastreio: (info?.tracking ?? item.tracking) as string | undefined,
  };
}

/** Consulta o andamento no Melhor Envio pra mostrar ao cliente. */
export async function rastrear(envioId: string) {
  const resposta = await meFetch('/api/v2/me/shipment/tracking', {
    method: 'POST',
    body: JSON.stringify({ orders: [envioId] }),
  });
  return resposta?.[envioId];
}
