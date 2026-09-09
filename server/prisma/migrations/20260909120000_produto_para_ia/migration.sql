-- Separa o produto base da personalizacao por IA (so o esboco do painel, sem
-- estampa) do produto normal de catalogo. Comeca false em todos: o catalogo de
-- hoje e todo de produto pronto, e marcar sozinho tiraria produto da loja.
ALTER TABLE "produtos" ADD COLUMN "paraIA" BOOLEAN NOT NULL DEFAULT false;

-- O catalogo publico filtra por esta coluna a cada listagem.
CREATE INDEX "produtos_paraIA_idx" ON "produtos"("paraIA");
