import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function upsertUsuario(nome: string, email: string, senha: string, role: 'ADMIN' | 'CLIENTE') {
  const senhaHash = await bcrypt.hash(senha, 10);
  return prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { nome, email, senhaHash, role },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertTag(delegate: any, nome: string): Promise<{ id: string }> {
  const slug = slugify(nome);
  return delegate.upsert({ where: { slug }, update: {}, create: { nome, slug } });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@globaldecora.com';
  const adminSenha = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';
  const clienteEmail = process.env.SEED_CLIENTE_EMAIL ?? 'cliente@example.com';
  const clienteSenha = process.env.SEED_CLIENTE_PASSWORD ?? 'changeme123';

  await upsertUsuario('Admin Global Decora', adminEmail, adminSenha, 'ADMIN');
  await upsertUsuario('Cliente Teste', clienteEmail, clienteSenha, 'CLIENTE');

  const redondo = await upsertTag(prisma.formato, 'Redondo');
  await upsertTag(prisma.formato, 'Quadrado');

  const halloween = await upsertTag(prisma.estilo, 'Halloween');
  await upsertTag(prisma.estilo, 'Natal');

  const categoria = await prisma.categoria.upsert({
    where: { slug: 'aniversario-infantil' },
    update: {},
    create: {
      nome: 'Aniversario Infantil',
      slug: 'aniversario-infantil',
      descricao: 'Kits e produtos para festas de aniversario infantil',
    },
  });

  const produtoExistente = await prisma.produto.findFirst({
    where: { nome: 'Painel Redondo Halloween' },
  });

  if (!produtoExistente) {
    await prisma.produto.create({
      data: {
        nome: 'Painel Redondo Halloween',
        descricao: 'Painel decorativo redondo com tema Halloween, pronto para festa.',
        preco: 149.9,
        medidas: '1.5m diametro',
        peso: 1.2,
        categoriaId: categoria.id,
        formatoId: redondo.id,
        estiloId: halloween.id,
      },
    });
  }

  console.log('Seed concluido.');
  console.log(`Admin: ${adminEmail} / ${adminSenha}`);
  console.log(`Cliente: ${clienteEmail} / ${clienteSenha}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
