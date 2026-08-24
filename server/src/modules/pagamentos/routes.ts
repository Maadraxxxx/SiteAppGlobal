import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { env } from '../../config/env';
import * as pagamentosService from './service';

/**
 * Confere a assinatura que o MP manda no header `x-signature`.
 * Formato: "ts=<timestamp>,v1=<hash>", sobre `id:<id>;request-id:<rid>;ts:<ts>;`.
 * Sem MERCADOPAGO_WEBHOOK_SECRET configurado a checagem e pulada — util em teste local,
 * mas em producao configure, senao qualquer um consegue marcar pedido como pago.
 */
function assinaturaValida(request: FastifyRequest, dataId: string) {
  if (!env.MERCADOPAGO_WEBHOOK_SECRET) return true;

  const assinatura = request.headers['x-signature'];
  const requestId = request.headers['x-request-id'];
  if (typeof assinatura !== 'string') return false;

  const partes = Object.fromEntries(
    assinatura.split(',').map((p) => p.split('=').map((s) => s.trim()) as [string, string]),
  );
  const ts = partes.ts;
  const recebido = partes.v1;
  if (!ts || !recebido) return false;

  const manifesto = `id:${dataId};request-id:${requestId ?? ''};ts:${ts};`;
  const esperado = createHmac('sha256', env.MERCADOPAGO_WEBHOOK_SECRET).update(manifesto).digest('hex');

  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(recebido, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export default async function pagamentosRoutes(app: FastifyInstance) {
  // Publica: quem chama e o Mercado Pago, nao o app.
  app.post('/pagamentos/webhook', async (request, reply) => {
    const corpo = request.body as { type?: string; action?: string; data?: { id?: string } } | undefined;
    const dataId = corpo?.data?.id ? String(corpo.data.id) : undefined;
    const ehPagamento = corpo?.type === 'payment' || corpo?.action?.startsWith('payment.');

    if (!ehPagamento || !dataId) {
      // Outros eventos do MP nao interessam — 200 pra ele parar de reenviar.
      return reply.code(200).send({ ignorado: true });
    }

    if (!assinaturaValida(request, dataId)) {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Assinatura invalida' } });
    }

    try {
      await pagamentosService.processarNotificacao(dataId);
    } catch (erro) {
      // Responder erro faz o MP reenviar; logamos e devolvemos 200 pra
      // notificacao de pagamento que nao e nosso nao virar retry infinito.
      app.log.error({ erro, dataId }, 'Falha ao processar webhook do Mercado Pago');
    }

    return reply.code(200).send({ recebido: true });
  });
}
