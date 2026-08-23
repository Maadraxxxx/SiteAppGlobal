-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "TamanhoKit" AS ENUM ('P', 'M', 'G');

-- CreateEnum
CREATE TYPE "StatusKit" AS ENUM ('RASCUNHO', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADO');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_PRODUCAO', 'ENVIADO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoItemPedido" AS ENUM ('PRODUTO', 'KIT_CUSTOMIZADO');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('PIX', 'CARTAO');

-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'CANCELADO', 'ESTORNADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formatos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estilos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estilos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "medidas" TEXT,
    "peso" DECIMAL(10,3),
    "imagemUrl" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "formatoId" TEXT NOT NULL,
    "estiloId" TEXT NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kits_customizados" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "formatoId" TEXT NOT NULL,
    "temaId" TEXT NOT NULL,
    "cores" TEXT NOT NULL,
    "estiloVisual" TEXT,
    "tipoEvento" TEXT,
    "observacoes" TEXT,
    "imagemGeradaUrl" TEXT,
    "tamanho" "TamanhoKit",
    "preco" DECIMAL(10,2),
    "status" "StatusKit" NOT NULL DEFAULT 'RASCUNHO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kits_customizados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    "total" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_do_pedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "tipo" "TipoItemPedido" NOT NULL,
    "produtoId" TEXT,
    "kitCustomizadoId" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "precoUnitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "itens_do_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "metodo" "MetodoPagamento" NOT NULL,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "valor" DECIMAL(10,2) NOT NULL,
    "mercadoPagoPaymentId" TEXT,
    "qrCodeBase64" TEXT,
    "qrCodeCopiaCola" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nome_key" ON "categorias"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "formatos_nome_key" ON "formatos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "formatos_slug_key" ON "formatos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "estilos_nome_key" ON "estilos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "estilos_slug_key" ON "estilos"("slug");

-- CreateIndex
CREATE INDEX "produtos_categoriaId_idx" ON "produtos"("categoriaId");

-- CreateIndex
CREATE INDEX "produtos_formatoId_idx" ON "produtos"("formatoId");

-- CreateIndex
CREATE INDEX "produtos_estiloId_idx" ON "produtos"("estiloId");

-- CreateIndex
CREATE UNIQUE INDEX "itens_do_pedido_kitCustomizadoId_key" ON "itens_do_pedido"("kitCustomizadoId");

-- CreateIndex
CREATE UNIQUE INDEX "pagamentos_mercadoPagoPaymentId_key" ON "pagamentos"("mercadoPagoPaymentId");

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_formatoId_fkey" FOREIGN KEY ("formatoId") REFERENCES "formatos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_estiloId_fkey" FOREIGN KEY ("estiloId") REFERENCES "estilos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits_customizados" ADD CONSTRAINT "kits_customizados_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits_customizados" ADD CONSTRAINT "kits_customizados_formatoId_fkey" FOREIGN KEY ("formatoId") REFERENCES "formatos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits_customizados" ADD CONSTRAINT "kits_customizados_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "estilos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_do_pedido" ADD CONSTRAINT "itens_do_pedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_do_pedido" ADD CONSTRAINT "itens_do_pedido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_do_pedido" ADD CONSTRAINT "itens_do_pedido_kitCustomizadoId_fkey" FOREIGN KEY ("kitCustomizadoId") REFERENCES "kits_customizados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
