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

  // Conta criada pelo Google não tem senha — avisa o caminho certo em vez de
  // deixar a pessoa tentando adivinhar uma senha que nunca existiu.
  if (!usuario.senhaHash) {
    throw unauthorized('Essa conta entra com o Google. Use o botao "Entrar com Google".');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
  if (!senhaValida) {
    throw unauthorized('Email ou senha invalidos');
  }

  return usuario;
}

/**
 * Entra (ou cria a conta) a partir de um perfil já verificado no Google.
 *
 * Três casos:
 *  - já entrou com Google antes: acha pelo googleId;
 *  - tem conta com senha no mesmo e-mail: liga as duas, mantendo a senha. O
 *    Google confirmou que o e-mail é dela, então é a mesma pessoa;
 *  - ninguém: cria conta nova, sem senha.
 */
export async function loginComGoogle(perfil: {
  googleId: string;
  email: string;
  nome: string;
  avatarUrl?: string;
}) {
  const porGoogleId = await prisma.usuario.findUnique({ where: { googleId: perfil.googleId } });
  if (porGoogleId) {
    return prisma.usuario.update({
      where: { id: porGoogleId.id },
      data: { avatarUrl: perfil.avatarUrl ?? porGoogleId.avatarUrl },
    });
  }

  const porEmail = await prisma.usuario.findUnique({ where: { email: perfil.email } });
  if (porEmail) {
    return prisma.usuario.update({
      where: { id: porEmail.id },
      data: { googleId: perfil.googleId, avatarUrl: perfil.avatarUrl ?? porEmail.avatarUrl },
    });
  }

  return prisma.usuario.create({
    data: {
      nome: perfil.nome,
      email: perfil.email,
      googleId: perfil.googleId,
      avatarUrl: perfil.avatarUrl,
      role: 'CLIENTE',
    },
  });
}

export async function findUsuarioById(id: string) {
  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) {
    throw notFound('Usuario nao encontrado');
  }
  return usuario;
}

export async function updatePerfil(id: string, nome: string, email: string) {
  const emailEmUso = await prisma.usuario.findFirst({ where: { email, NOT: { id } } });
  if (emailEmUso) {
    throw badRequest('Ja existe uma conta com esse email');
  }
  return prisma.usuario.update({ where: { id }, data: { nome, email } });
}

export async function updateSenha(id: string, senhaAtual: string, novaSenha: string) {
  const usuario = await findUsuarioById(id);

  // Quem entrou pelo Google nunca teve senha: deixa definir uma sem pedir a
  // anterior, pra poder passar a entrar dos dois jeitos.
  if (usuario.senhaHash) {
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senhaHash);
    if (!senhaValida) {
      throw badRequest('Senha atual incorreta');
    }
  }

  const senhaHash = await bcrypt.hash(novaSenha, 10);
  await prisma.usuario.update({ where: { id }, data: { senhaHash } });
}

export function toPublicUsuario(usuario: { id: string; nome: string; email: string; role: string }) {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role };
}
