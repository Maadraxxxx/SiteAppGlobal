import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { enviarEmail, moldeRecuperacao } from '../../lib/email';
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

/** Quanto tempo o link do e-mail vale. Curto: e uma chave da conta por e-mail. */
const VALIDADE_MINUTOS = 30;
/** Espaco minimo entre dois pedidos do mesmo e-mail, pra nao virar metralhadora. */
const INTERVALO_MINIMO_MS = 60 * 1000;

function hashDoToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Comeca uma recuperacao de senha.
 *
 * Nao diz se o e-mail existe. Uma resposta diferente pra "nao encontrado"
 * transformaria esta rota num verificador de cadastro: qualquer um poderia
 * descobrir quem e cliente da loja.
 */
export async function pedirRecuperacao(email: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Conta so do Google nunca teve senha. Criar uma por aqui daria certo, mas
  // sem senha anterior nao ha o que "recuperar" — e mandar o e-mail sugeriria
  // que existe uma senha esquecida. Ela continua entrando pelo Google.
  if (!usuario || !usuario.senhaHash) return;

  const recente = await prisma.tokenSenha.findFirst({
    where: {
      usuarioId: usuario.id,
      usadoEm: null,
      createdAt: { gt: new Date(Date.now() - INTERVALO_MINIMO_MS) },
    },
  });
  if (recente) return;

  // Os pedidos anteriores morrem: dois links validos ao mesmo tempo so
  // aumentam a janela de risco sem ajudar ninguem.
  await prisma.tokenSenha.updateMany({
    where: { usuarioId: usuario.id, usadoEm: null },
    data: { usadoEm: new Date() },
  });

  const token = randomBytes(32).toString('hex');
  await prisma.tokenSenha.create({
    data: {
      usuarioId: usuario.id,
      tokenHash: hashDoToken(token),
      expiraEm: new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000),
    },
  });

  const link = `${env.APP_URL.replace(/\/$/, '')}/redefinir-senha?token=${token}`;
  const { html, texto } = moldeRecuperacao(usuario.nome, link, VALIDADE_MINUTOS);

  await enviarEmail({
    para: usuario.email,
    assunto: 'Redefinir sua senha — Global Decora',
    html,
    texto,
  });
}

/**
 * Fecha a recuperacao: troca a senha e queima o token.
 *
 * Aqui o erro e explicito, ao contrario do pedido: quem chegou com um link na
 * mao precisa saber que ele expirou, senao fica tentando a mesma coisa.
 */
export async function redefinirSenha(token: string, novaSenha: string) {
  const registro = await prisma.tokenSenha.findUnique({
    where: { tokenHash: hashDoToken(token) },
  });

  if (!registro || registro.usadoEm || registro.expiraEm < new Date()) {
    throw badRequest('Este link não vale mais. Peça a recuperação de novo.');
  }

  const senhaHash = await bcrypt.hash(novaSenha, 10);

  // As duas escritas juntas: senha trocada com token ainda valido deixaria o
  // link servindo pra uma segunda troca.
  await prisma.$transaction([
    prisma.usuario.update({ where: { id: registro.usuarioId }, data: { senhaHash } }),
    prisma.tokenSenha.update({ where: { id: registro.id }, data: { usadoEm: new Date() } }),
  ]);
}
