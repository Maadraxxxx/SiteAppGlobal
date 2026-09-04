-- Suporte: uma conversa (chamado) com N mensagens, entre o cliente e a loja.

CREATE TYPE "StatusChamado" AS ENUM ('ABERTO', 'RESPONDIDO', 'RESOLVIDO');
CREATE TYPE "AutorMensagem" AS ENUM ('CLIENTE', 'LOJA');

CREATE TABLE "chamados" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "status" "StatusChamado" NOT NULL DEFAULT 'ABERTO',
    "pedidoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chamados_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mensagens_chamado" (
    "id" TEXT NOT NULL,
    "chamadoId" TEXT NOT NULL,
    "autor" "AutorMensagem" NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_chamado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chamados_usuarioId_idx" ON "chamados"("usuarioId");
CREATE INDEX "chamados_status_idx" ON "chamados"("status");
CREATE INDEX "mensagens_chamado_chamadoId_idx" ON "mensagens_chamado"("chamadoId");

ALTER TABLE "chamados" ADD CONSTRAINT "chamados_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pedido apagado nao leva o chamado junto: a conversa continua valendo.
ALTER TABLE "chamados" ADD CONSTRAINT "chamados_pedidoId_fkey"
    FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "mensagens_chamado" ADD CONSTRAINT "mensagens_chamado_chamadoId_fkey"
    FOREIGN KEY ("chamadoId") REFERENCES "chamados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
