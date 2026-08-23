import { prisma } from '../../db/prisma';
import { notFound } from '../../lib/http-error';

export function listBannersAtivos() {
  return prisma.banner.findMany({ where: { ativo: true }, orderBy: { ordem: 'asc' } });
}

export function listBannersAdmin() {
  return prisma.banner.findMany({ orderBy: { ordem: 'asc' } });
}

export async function createBanner(imagemUrl: string) {
  const ultimo = await prisma.banner.findFirst({ orderBy: { ordem: 'desc' } });
  const ordem = ultimo ? ultimo.ordem + 1 : 0;
  return prisma.banner.create({ data: { imagemUrl, ordem } });
}

export async function getBanner(id: string) {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) throw notFound('Banner nao encontrado');
  return banner;
}

export async function removeBanner(id: string) {
  await getBanner(id);
  await prisma.banner.delete({ where: { id } });
}
