-- Entrar com Apple e exclusao de conta, as duas exigencias da App Store.
-- So colunas novas e opcionais: nenhuma conta existente muda.
ALTER TABLE "usuarios" ADD COLUMN "appleId" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "appleRefreshToken" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "excluidaEm" TIMESTAMP(3);

CREATE UNIQUE INDEX "usuarios_appleId_key" ON "usuarios"("appleId");
