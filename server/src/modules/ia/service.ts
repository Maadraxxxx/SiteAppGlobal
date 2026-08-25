import { Prisma, StatusPagamento } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { badRequest, notFound } from '../../lib/http-error';
import { consultarPagamento, criarPagamentoPix } from '../../lib/mercadopago';

/** Meia-noite de hoje, no fuso do servidor — inicio da janela da cota diaria. */
function inicioDoDia() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

export interface SaldoIA {
  gratuitasPorDia: number;
  gratuitasUsadasHoje: number;
  gratuitasRestantes: number;
  creditos: number;
  precoGeracao: number;
  /** true se der pra gerar agora, seja de graca ou gastando credito */
  podeGerar: boolean;
}

export async function saldo(usuarioId: string): Promise<SaldoIA> {
  const [usadasHoje, usuario] = await Promise.all([
    prisma.geracaoImagem.count({
      where: { usuarioId, paga: false, createdAt: { gte: inicioDoDia() } },
    }),
    prisma.usuario.findUnique({ where: { id: usuarioId }, select: { creditosIA: true } }),
  ]);

  const gratuitasRestantes = Math.max(0, env.IA_GRATIS_POR_DIA - usadasHoje);
  const creditos = usuario?.creditosIA ?? 0;

  return {
    gratuitasPorDia: env.IA_GRATIS_POR_DIA,
    gratuitasUsadasHoje: usadasHoje,
    gratuitasRestantes,
    creditos,
    precoGeracao: env.IA_PRECO_GERACAO,
    podeGerar: gratuitasRestantes > 0 || creditos > 0,
  };
}

/**
 * Reserva uma geracao antes de chamar a IA: gasta a cota gratuita do dia ou,
 * se ela acabou, um credito comprado. Devolve se foi paga.
 *
 * O credito e debitado aqui, nao depois de gerar — se debitasse no fim, duas
 * chamadas ao mesmo tempo passariam as duas com um credito so.
 */
export async function reservarGeracao(usuarioId: string): Promise<{ paga: boolean }> {
  const usadasHoje = await prisma.geracaoImagem.count({
    where: { usuarioId, paga: false, createdAt: { gte: inicioDoDia() } },
  });

  if (usadasHoje < env.IA_GRATIS_POR_DIA) return { paga: false };

  // updateMany com a condicao no where: se o saldo mudou no meio do caminho,
  // nenhuma linha e afetada e a gente sabe que nao deu.
  const debitou = await prisma.usuario.updateMany({
    where: { id: usuarioId, creditosIA: { gt: 0 } },
    data: { creditosIA: { decrement: 1 } },
  });

  if (debitou.count === 0) {
    throw badRequest(
      `Você já usou suas ${env.IA_GRATIS_POR_DIA} gerações de hoje. Compre créditos para continuar.`,
    );
  }

  return { paga: true };
}

/** Devolve o credito quando a geracao falha depois de reservada. */
export async function estornarGeracao(usuarioId: string) {
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { creditosIA: { increment: 1 } },
  });
}

export function registrarGeracao(params: {
  usuarioId: string;
  produtoId: string;
  tema: string;
  imagemUrl: string;
  paga: boolean;
}) {
  return prisma.geracaoImagem.create({ data: params });
}

export function historico(usuarioId: string) {
  return prisma.geracaoImagem.findMany({
    where: { usuarioId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { produto: { select: { id: true, nome: true } } },
  });
}

export async function comprarCreditos(usuarioId: string, quantidade: number) {
  if (quantidade < 1 || quantidade > 50) throw badRequest('Quantidade invalida');

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw notFound('Usuario nao encontrado');

  const valor = new Prisma.Decimal(env.IA_PRECO_GERACAO).mul(quantidade);

  const compra = await prisma.compraCreditoIA.create({
    data: { usuarioId, quantidade, valor },
  });

  const pix = await criarPagamentoPix({
    valor: Number(valor),
    descricao: `${quantidade} ${quantidade === 1 ? 'geração' : 'gerações'} com IA — Global Decora`,
    emailPagador: usuario.email,
    nomePagador: usuario.nome,
    referencia: compra.id,
  });

  return prisma.compraCreditoIA.update({
    where: { id: compra.id },
    data: {
      status: pix.status,
      mercadoPagoPaymentId: pix.mercadoPagoPaymentId,
      qrCodeBase64: pix.qrCodeBase64,
      qrCodeCopiaCola: pix.qrCodeCopiaCola,
    },
  });
}

/**
 * Credita a compra uma unica vez. O `where` exige que ainda esteja PENDENTE,
 * entao webhook e consulta do app podem chegar juntos sem creditar em dobro.
 */
async function creditarSeAprovado(compraId: string, status: StatusPagamento) {
  if (status !== StatusPagamento.APROVADO) {
    await prisma.compraCreditoIA.updateMany({
      where: { id: compraId, status: StatusPagamento.PENDENTE },
      data: { status },
    });
    return;
  }

  const marcou = await prisma.compraCreditoIA.updateMany({
    where: { id: compraId, status: StatusPagamento.PENDENTE },
    data: { status: StatusPagamento.APROVADO },
  });
  if (marcou.count === 0) return;

  const compra = await prisma.compraCreditoIA.findUnique({ where: { id: compraId } });
  if (!compra) return;

  await prisma.usuario.update({
    where: { id: compra.usuarioId },
    data: { creditosIA: { increment: compra.quantidade } },
  });
}

export async function sincronizarCompra(compraId: string, usuarioId: string) {
  const compra = await prisma.compraCreditoIA.findUnique({ where: { id: compraId } });
  if (!compra || compra.usuarioId !== usuarioId) throw notFound('Compra nao encontrada');

  if (compra.status === StatusPagamento.PENDENTE && compra.mercadoPagoPaymentId) {
    const { status } = await consultarPagamento(compra.mercadoPagoPaymentId);
    if (status !== compra.status) {
      await creditarSeAprovado(compra.id, status);
      return prisma.compraCreditoIA.findUnique({ where: { id: compraId } });
    }
  }

  return compra;
}

/** Chamado pelo webhook do MP quando o pagamento e de uma compra de creditos. */
export async function processarNotificacao(mercadoPagoPaymentId: string) {
  const compra = await prisma.compraCreditoIA.findUnique({ where: { mercadoPagoPaymentId } });
  if (!compra) return false;

  const { status } = await consultarPagamento(mercadoPagoPaymentId);
  if (status !== compra.status) await creditarSeAprovado(compra.id, status);
  return true;
}
