-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "enderecoBairro" TEXT,
ADD COLUMN     "enderecoCidade" TEXT,
ADD COLUMN     "enderecoComplemento" TEXT,
ADD COLUMN     "enderecoLogradouro" TEXT,
ADD COLUMN     "enderecoNumero" TEXT,
ADD COLUMN     "enderecoUf" TEXT;

-- CreateTable
CREATE TABLE "enderecos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "apelido" TEXT,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enderecos_usuarioId_idx" ON "enderecos"("usuarioId");

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
