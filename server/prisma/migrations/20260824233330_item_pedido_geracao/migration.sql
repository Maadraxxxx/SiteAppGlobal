-- AlterTable
ALTER TABLE "itens_do_pedido" ADD COLUMN     "geracaoImagemId" TEXT;

-- AddForeignKey
ALTER TABLE "itens_do_pedido" ADD CONSTRAINT "itens_do_pedido_geracaoImagemId_fkey" FOREIGN KEY ("geracaoImagemId") REFERENCES "geracoes_imagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

