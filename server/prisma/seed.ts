import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertUsuario(nome: string, email: string, senha: string, role: 'ADMIN' | 'CLIENTE') {
  const senhaHash = await bcrypt.hash(senha, 10);
  return prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { nome, email, senhaHash, role },
  });
}

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@globaldecora.com';
  const adminSenha = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';
  const clienteEmail = process.env.SEED_CLIENTE_EMAIL ?? 'cliente@example.com';
  const clienteSenha = process.env.SEED_CLIENTE_PASSWORD ?? 'changeme123';

  await upsertUsuario('Admin Global Decora', adminEmail, adminSenha, 'ADMIN');
  await upsertUsuario('Cliente Teste', clienteEmail, clienteSenha, 'CLIENTE');

  console.log('Seed concluido — apenas contas de acesso, sem categorias/produtos.');
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
