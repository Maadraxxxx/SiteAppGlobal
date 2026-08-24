-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "cepDestino" TEXT,
ADD COLUMN     "fretePrazoDias" INTEGER,
ADD COLUMN     "freteServico" TEXT,
ADD COLUMN     "freteTransportadora" TEXT,
ADD COLUMN     "freteValor" DECIMAL(10,2),
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0;
