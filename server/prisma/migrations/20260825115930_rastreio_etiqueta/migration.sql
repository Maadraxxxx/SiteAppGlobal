-- AlterTable
ALTER TABLE "enderecos" ADD COLUMN     "documento" TEXT;

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "codigoRastreio" TEXT,
ADD COLUMN     "melhorEnvioEnvioId" TEXT,
ADD COLUMN     "urlEtiqueta" TEXT;

