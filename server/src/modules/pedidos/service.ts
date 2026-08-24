import { StatusPedido } from '@prisma/client';
import { prisma } from '../../db/prisma';

// "Arrecadado" e dinheiro que de fato entrou, entao pedido ainda aguardando
// pagamento nao entra na soma — so os status que ja passaram pelo pagamento.
const STATUS_PAGOS: StatusPedido[] = [
  StatusPedido.PAGO,
  StatusPedido.EM_PRODUCAO,
  StatusPedido.ENVIADO,
  StatusPedido.CONCLUIDO,
];

/** Primeiro instante do mes corrente, no fuso do servidor. */
function inicioDoMes() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), 1);
}

export async function resumoDoMes() {
  const desde = inicioDoMes();

  const [quantidade, soma] = await Promise.all([
    // Cancelado nao conta como pedido do mes pra quem olha o resumo.
    prisma.pedido.count({
      where: { createdAt: { gte: desde }, status: { not: StatusPedido.CANCELADO } },
    }),
    prisma.pedido.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: desde }, status: { in: STATUS_PAGOS } },
    }),
  ]);

  return {
    quantidade,
    arrecadado: (soma._sum.total ?? 0).toString(),
  };
}
