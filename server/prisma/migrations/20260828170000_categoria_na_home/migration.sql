-- Marca quais categorias ganham vitrine propria na tela inicial. Comeca
-- desligado em todas: a Home hoje so tem Destaques, e ligar tudo de uma vez
-- encheria a tela sem o admin pedir.
ALTER TABLE "categorias" ADD COLUMN "naHome" BOOLEAN NOT NULL DEFAULT false;
