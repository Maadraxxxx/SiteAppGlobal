import { env } from '../config/env';
import { badRequest } from './http-error';

const BASE_SANDBOX = 'https://sandbox.melhorenvio.com.br';
const BASE_PRODUCAO = 'https://melhorenvio.com.br';

function assertConfigured() {
  if (!env.MELHOR_ENVIO_TOKEN) {
    throw badRequest('Frete ainda nao configurado — falta MELHOR_ENVIO_TOKEN no servidor.');
  }
  if (!env.FRETE_CEP_ORIGEM) {
    throw badRequest('Frete ainda nao configurado — falta FRETE_CEP_ORIGEM (CEP da loja).');
  }
}

export function apenasDigitos(cep: string) {
  return cep.replace(/\D/g, '');
}

export function cepValido(cep: string) {
  return apenasDigitos(cep).length === 8;
}

export interface VolumeEntrada {
  id: string;
  /** cm */
  comprimento: number;
  largura: number;
  altura: number;
  /** kg */
  peso: number;
  /** valor declarado, usado pro seguro */
  valor: number;
  quantidade: number;
}

export interface OpcaoFrete {
  id: number;
  nome: string;
  transportadora: string;
  preco: number;
  prazoDias: number;
}

interface RespostaServico {
  id: number;
  name: string;
  price?: string;
  custom_price?: string;
  delivery_time?: number;
  company?: { name?: string };
  error?: string;
}

export async function calcularFrete(params: {
  cepDestino: string;
  volumes: VolumeEntrada[];
}): Promise<OpcaoFrete[]> {
  assertConfigured();

  const destino = apenasDigitos(params.cepDestino);
  if (destino.length !== 8) throw badRequest('CEP de destino invalido');
  if (!params.volumes.length) throw badRequest('Nada para calcular o frete');

  const base = env.MELHOR_ENVIO_SANDBOX ? BASE_SANDBOX : BASE_PRODUCAO;

  const res = await fetch(`${base}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.MELHOR_ENVIO_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      // A API deles recusa requisicao sem User-Agent com contato.
      'User-Agent': `Global Decora (${env.MELHOR_ENVIO_CONTATO})`,
    },
    body: JSON.stringify({
      from: { postal_code: apenasDigitos(env.FRETE_CEP_ORIGEM as string) },
      to: { postal_code: destino },
      products: params.volumes.map((v) => ({
        id: v.id,
        width: v.largura,
        height: v.altura,
        length: v.comprimento,
        weight: v.peso,
        insurance_value: v.valor,
        quantity: v.quantidade,
      })),
    }),
  });

  const texto = await res.text();
  if (!res.ok) {
    throw new Error(`Melhor Envio respondeu ${res.status}: ${texto.slice(0, 300)}`);
  }

  const servicos = JSON.parse(texto) as RespostaServico[];

  return servicos
    // Servico que veio com erro (nao atende o CEP, excede peso...) nao vira opcao.
    .filter((s) => !s.error && (s.price || s.custom_price))
    .map((s) => ({
      id: s.id,
      nome: s.name,
      transportadora: s.company?.name ?? '',
      preco: Number(s.custom_price ?? s.price),
      prazoDias: s.delivery_time ?? 0,
    }))
    .filter((s) => Number.isFinite(s.preco))
    .sort((a, b) => a.preco - b.preco);
}
