-- Pedidos de recuperacao de senha em aberto. O codigo enviado por e-mail nao
-- e gravado: guardamos so o SHA-256 dele, pra que ler a tabela nao permita
-- trocar a senha de ninguem.
CREATE TABLE "tokens_senha" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_senha_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tokens_senha_tokenHash_key" ON "tokens_senha"("tokenHash");
CREATE INDEX "tokens_senha_usuarioId_idx" ON "tokens_senha"("usuarioId");

ALTER TABLE "tokens_senha" ADD CONSTRAINT "tokens_senha_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
