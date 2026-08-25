-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "creditosIA" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "geracoes_imagem" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "imagemUrl" TEXT NOT NULL,
    "paga" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geracoes_imagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras_credito_ia" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "mercadoPagoPaymentId" TEXT,
    "qrCodeBase64" TEXT,
    "qrCodeCopiaCola" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compras_credito_ia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "geracoes_imagem_usuarioId_createdAt_idx" ON "geracoes_imagem"("usuarioId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "compras_credito_ia_mercadoPagoPaymentId_key" ON "compras_credito_ia"("mercadoPagoPaymentId");

-- CreateIndex
CREATE INDEX "compras_credito_ia_usuarioId_idx" ON "compras_credito_ia"("usuarioId");

-- AddForeignKey
ALTER TABLE "geracoes_imagem" ADD CONSTRAINT "geracoes_imagem_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "geracoes_imagem" ADD CONSTRAINT "geracoes_imagem_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras_credito_ia" ADD CONSTRAINT "compras_credito_ia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

