-- Separa o status unico do pedido em dois eixos independentes: dinheiro
-- (pagamento) e bancada (producao/envio). Antes um excluia o outro — um pedido
-- "EM_PRODUCAO" nao conseguia dizer que estava pago.

CREATE TYPE "StatusPagamentoPedido" AS ENUM ('AGUARDANDO', 'PAGO', 'CANCELADO');
CREATE TYPE "StatusProducao" AS ENUM ('AGUARDANDO', 'EM_PRODUCAO', 'ENVIADO', 'ENTREGUE');

ALTER TABLE "pedidos" ADD COLUMN "statusPagamento" "StatusPagamentoPedido" NOT NULL DEFAULT 'AGUARDANDO';
ALTER TABLE "pedidos" ADD COLUMN "statusProducao" "StatusProducao" NOT NULL DEFAULT 'AGUARDANDO';

-- Traduz o que ja existe. Tudo que passou do pagamento vira PAGO no eixo do
-- dinheiro; a etapa da bancada sai do proprio nome do status antigo.
UPDATE "pedidos" SET "statusPagamento" = 'PAGO'
  WHERE "status" IN ('PAGO', 'EM_PRODUCAO', 'ENVIADO', 'CONCLUIDO');
UPDATE "pedidos" SET "statusPagamento" = 'CANCELADO' WHERE "status" = 'CANCELADO';

UPDATE "pedidos" SET "statusProducao" = 'EM_PRODUCAO' WHERE "status" = 'EM_PRODUCAO';
UPDATE "pedidos" SET "statusProducao" = 'ENVIADO'     WHERE "status" = 'ENVIADO';
UPDATE "pedidos" SET "statusProducao" = 'ENTREGUE'    WHERE "status" = 'CONCLUIDO';

-- Só depois de traduzir tudo. Manter as duas fontes seria pedir divergencia.
ALTER TABLE "pedidos" DROP COLUMN "status";
DROP TYPE "StatusPedido";
