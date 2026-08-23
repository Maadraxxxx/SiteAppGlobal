/*
  Warnings:

  - You are about to drop the column `medidas` on the `produtos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "produtos" DROP COLUMN "medidas",
ADD COLUMN     "altura" DECIMAL(10,2),
ADD COLUMN     "comprimento" DECIMAL(10,2),
ADD COLUMN     "largura" DECIMAL(10,2);
