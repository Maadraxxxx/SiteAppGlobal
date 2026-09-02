-- Ajustes globais da loja, editaveis pelo admin. Linha unica, criada aqui ja
-- com o padrao: assim a leitura nunca precisa tratar "tabela vazia".
CREATE TABLE "configuracao_app" (
    "id" TEXT NOT NULL DEFAULT 'unica',
    "introVideoUrl" TEXT,
    "introVideoAtivo" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracao_app_pkey" PRIMARY KEY ("id")
);

INSERT INTO "configuracao_app" ("id", "introVideoAtivo", "updatedAt")
VALUES ('unica', true, NOW());
