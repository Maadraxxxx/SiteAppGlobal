import bcrypt from 'bcryptjs';
import { prisma } from '../../db/prisma';
import { badRequest, notFound, unauthorized } from '../../lib/http-error';

export async function registerCliente(nome: string, email: string, senha: string) {
  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (existing) {
    throw badRequest('Ja existe uma conta com esse email');
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const usuario = await prisma.usuario.create({
    data: { nome, email, senhaHash, role: 'CLIENTE' },
  });

  return usuario;
}

export async function login(email: string, senha: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario) {
    throw unauthorized('Email ou senha invalidos');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) {
    throw unauthorized('Email ou senha invalidos');
  }

  return usuario;
}

export async function findUsuarioById(id: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    throw notFound('Usuario nao encontrado');
  }
  return usuario;
}

export function toPublicUsuario(usuario: { id: string; nome: string; email: string; role: string }) {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role };
}
