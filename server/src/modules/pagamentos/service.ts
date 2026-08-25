import { StatusPagamento, StatusPagamentoPedido } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { badRequest, notFound } from '../../lib/http-error';
import { consultarPagamento, criarPagamentoPix } from '../../lib/mercadopago';
import { getPedido } from '../pedidos/service';

/**
 * Quando o pagamento e aprovado o pedido sai de "aguardando" e vira PAGO. Mexe
 * so no eixo do dinheiro: a etapa da bancada e decisao do admin, nao do MP.
 */
async function refletirNoPedido(pedidoId: string, status: StatusPagamento) {
  if (status === StatusPagamento.APROVADO) {
    await prisma.pedido.updateMany({
      where: { id: pedidoId, statusPagamento: StatusPagamentoPedido.AGUARDANDO },
      data: { statusPagamento: StatusPagamentoPedido.PAGO },
    });
  }
}

export async function criarPix(pedidoId: string, usuarioId: string) {
  const pedido = await getPedido(pedidoId, { usuarioId });

  if (pedido.statusPagamento !== StatusPagamentoPedido.AGUARDANDO) {
    throw badRequest('Esse pedido nao esta mais aguardando pagamento');
  }

  // Ja existe um PIX pendente pra esse pedido? Devolve o mesmo QR em vez de
  // gerar outra cobranca.
  const existente = await prisma.pagamento.findFirst({
    where: { pedidoId, metodo: 'PIX', status: StatusPagamento.PENDENTE },
    orderBy: { createdAt: 'desc' },
  });
  if (existente?.qrCodeCopiaCola) return existente;

  const criado = await criarPagamentoPix({
    valor: Number(pedido.total),
    descricao: `Pedido ${pedido.id.slice(0, 8)} — Global Decora`,
    emailPagador: pedido.usuario.email,
    nomePagador: pedido.usuario.nome,
    referencia: pedido.id,
  });

  const pagamento = await prisma.pagamento.create({
    data: {
      pedidoId,
      metodo: 'PIX',
      valor: pedido.total,
      status: criado.status,
      mercadoPagoPaymentId: criado.mercadoPagoPaymentId,
      qrCodeBase64: criado.qrCodeBase64,
      qrCodeCopiaCola: criado.qrCodeCopiaCola,
    },
  });

  await refletirNoPedido(pedidoId, pagamento.status);
  return pagamento;
}

/**
 * Consulta o MP e grava o que voltou. E o que o app chama enquanto o cliente
 * olha o QR — nao da pra depender so do webhook, que pode demorar ou nem
 * chegar em ambiente local.
 */
export async function sincronizarPagamento(pedidoId: string, usuarioId?: string) {
  await getPedido(pedidoId, usuarioId ? { usuarioId } : undefined);

  const pagamento = await prisma.pagamento.findFirst({
    where: { pedidoId },
    orderBy: { createdAt: 'desc' },
  });
  if (!pagamento) throw notFound('Esse pedido ainda nao tem pagamento');

  if (pagamento.status === StatusPagamento.PENDENTE && pagamento.mercadoPagoPaymentId) {
    const { status } = await consultarPagamento(pagamento.mercadoPagoPaymentId);
    if (status !== pagamento.status) {
      const atualizado = await prisma.pagamento.update({
        where: { id: pagamento.id },
        data: { status },
      });
      await refletirNoPedido(pedidoId, status);
      return atualizado;
    }
  }

  return pagamento;
}

/** Chamado pelo webhook do MP: acha o pagamento pelo id deles e atualiza. */
export async function processarNotificacao(mercadoPagoPaymentId: string) {
  const pagamento = await prisma.pagamento.findUnique({ where: { mercadoPagoPaymentId } });
  // Notificacao de pagamento que nao e nosso: ignora sem erro, senao o MP
  // fica reenviando pra sempre.
  if (!pagamento) return;

  const { status } = await consultarPagamento(mercadoPagoPaymentId);
  if (status === pagamento.status) return;

  await prisma.pagamento.update({ where: { id: pagamento.id }, data: { status } });
  await refletirNoPedido(pagamento.pedidoId, status);
}
