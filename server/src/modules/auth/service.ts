import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { revogacaoConfigurada, revogarAcesso, trocarCodigoPorRefreshToken } from '../../lib/apple-auth';
import { enviarEmail, moldeRecuperacao } from '../../lib/email';
import { removerArquivos } from '../../lib/supabase-storage';
import { prisma } from '../../db/prisma';
import { badRequest, conflict, notFound, unauthorized } from '../../lib/http-error';

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

  // Conta criada pelo Google ou pela Apple não tem senha — avisa o caminho
  // certo em vez de deixar a pessoa tentando adivinhar uma senha que nunca
  // existiu.
  if (!usuario.senhaHash) {
    const botao = usuario.googleId
      ? usuario.appleId
        ? '"Entrar com Google" ou "Entrar com a Apple"'
        : '"Entrar com Google"'
      : '"Entrar com a Apple"';
    throw unauthorized(`Essa conta não tem senha. Use o botão ${botao}.`);
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

/**
 * Entra (ou cria a conta) a partir de um token da Apple já verificado.
 *
 * Os mesmos três casos do Google, com duas diferenças que vêm da Apple:
 *  - o nome não vem no token. O app só o recebe na primeira autorização e
 *    repassa; nas seguintes não vem nada, e por isso nunca é atualizado aqui;
 *  - o e-mail pode faltar (conta Apple gerenciada por escola ou empresa). A
 *    conta nasce com um endereço de marcação, que a pessoa troca no perfil.
 */
export async function loginComApple(perfil: { appleId: string; email?: string; nome?: string }) {
  const porAppleId = await prisma.usuario.findUnique({ where: { appleId: perfil.appleId } });
  if (porAppleId) return porAppleId;

  if (perfil.email) {
    const porEmail = await prisma.usuario.findUnique({ where: { email: perfil.email } });
    if (porEmail) {
      return prisma.usuario.update({ where: { id: porEmail.id }, data: { appleId: perfil.appleId } });
    }
  }

  return prisma.usuario.create({
    data: {
      nome: perfil.nome?.trim() || 'Cliente',
      email: perfil.email ?? `${perfil.appleId}@sem-email.apple.invalid`,
      appleId: perfil.appleId,
      role: 'CLIENTE',
    },
  });
}

/**
 * Guarda o token que a revogação da Apple vai pedir no dia em que a conta for
 * excluída. Só dá pra obtê-lo agora, com o código que veio junto do login.
 */
export async function guardarRefreshTokenApple(usuarioId: string, authorizationCode: string, clientId: string) {
  const refreshToken = await trocarCodigoPorRefreshToken(authorizationCode, clientId);
  if (!refreshToken) return;
  await prisma.usuario.update({ where: { id: usuarioId }, data: { appleRefreshToken: refreshToken } });
}

/**
 * Exclui a conta a pedido do próprio cliente.
 *
 * O que some: tudo que identifica a pessoa — nome, e-mail, senha, vínculos com
 * Google e Apple, endereços (com o CPF), conversas de suporte, artes geradas
 * que não viraram pedido, e os pedidos que nunca foram pagos.
 *
 * O que fica: os pedidos pagos, com itens, valores e endereço de entrega. São
 * o registro de venda da loja, que a lei manda guardar; o cliente deixar a
 * loja não desfaz a venda. Eles continuam apontando pra esta linha, que por
 * isso não é apagada — vira uma casca sem dado pessoal nenhum, marcada com
 * `excluidaEm`.
 *
 * Duas recusas:
 *  - pedido pago que ainda não foi enviado. A etiqueta sai do nome e do CPF do
 *    cadastro; apagar agora deixaria a loja com um pedido pago que não tem
 *    como despachar. Depois do envio o cadastro não é mais necessário;
 *  - administrador. Um painel sem admin não se conserta sozinho, e essa trava
 *    já existe na troca de cargo — aqui ela só não pode ser contornada.
 */
export async function excluirConta(usuarioId: string) {
  const usuario = await findUsuarioById(usuarioId);

  if (usuario.role === 'ADMIN') {
    throw badRequest(
      'Contas de administrador não podem ser excluídas por aqui. Peça a outro administrador para remover o seu cargo primeiro.',
    );
  }

  const aEnviar = await prisma.pedido.count({
    where: {
      usuarioId,
      statusPagamento: 'PAGO',
      statusProducao: { in: ['AGUARDANDO', 'EM_PRODUCAO'] },
    },
  });
  if (aEnviar) {
    throw conflict(
      aEnviar === 1
        ? 'Você tem um pedido pago que ainda não foi enviado. Precisamos dos seus dados para a entrega — a conta pode ser excluída assim que ele for despachado.'
        : `Você tem ${aEnviar} pedidos pagos que ainda não foram enviados. Precisamos dos seus dados para a entrega — a conta pode ser excluída assim que eles forem despachados.`,
    );
  }

  // A Apple primeiro, enquanto o token ainda existe. Falha aqui não impede a
  // exclusão: o que o cliente pediu foi apagar os dados dele, e isso não pode
  // depender de um serviço de fora estar no ar.
  if (usuario.appleRefreshToken && revogacaoConfigurada()) {
    try {
      await revogarAcesso(usuario.appleRefreshToken);
    } catch (erro) {
      console.error('[auth] revogacao da Apple falhou:', erro instanceof Error ? erro.message : erro);
    }
  }

  // Mesmo critério da limpeza automática: só sai o pedido que nunca teve
  // pagamento aprovado.
  const naoPagos = await prisma.pedido.findMany({
    where: {
      usuarioId,
      statusPagamento: { in: ['AGUARDANDO', 'CANCELADO'] },
      pagamentos: { none: { status: 'APROVADO' } },
    },
    select: { id: true },
  });
  const idsNaoPagos = naoPagos.map((pedido) => pedido.id);

  // Arte que está num pedido que fica também fica: é o que foi produzido.
  const artesSoltas = await prisma.geracaoImagem.findMany({
    where: { usuarioId, itensPedido: { none: { pedidoId: { notIn: idsNaoPagos } } } },
    select: { id: true, imagemUrl: true },
  });

  // Tudo junto: metade de uma exclusão é pior que nenhuma. Os filhos vão
  // antes dos pais porque as relações de pedido não têm cascata.
  await prisma.$transaction([
    prisma.pagamento.deleteMany({ where: { pedidoId: { in: idsNaoPagos } } }),
    prisma.itemPedido.deleteMany({ where: { pedidoId: { in: idsNaoPagos } } }),
    prisma.chamado.deleteMany({ where: { usuarioId } }),
    prisma.pedido.deleteMany({ where: { id: { in: idsNaoPagos } } }),
    prisma.geracaoImagem.deleteMany({ where: { id: { in: artesSoltas.map((arte) => arte.id) } } }),
    prisma.kitCustomizado.deleteMany({ where: { usuarioId, itemPedido: { is: null } } }),
    prisma.compraCreditoIA.deleteMany({ where: { usuarioId, status: { not: 'APROVADO' } } }),
    prisma.endereco.deleteMany({ where: { usuarioId } }),
    prisma.tokenSenha.deleteMany({ where: { usuarioId } }),
    prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        nome: 'Conta excluída',
        // O e-mail é único e obrigatório. Este não existe, não recebe nada, e
        // deixa o endereço de verdade livre pra pessoa criar conta de novo.
        email: `conta-excluida-${usuarioId}@excluida.invalid`,
        senhaHash: null,
        googleId: null,
        appleId: null,
        appleRefreshToken: null,
        avatarUrl: null,
        creditosIA: 0,
        excluidaEm: new Date(),
      },
    }),
  ]);

  // Depois, e fora da transação: o banco já está certo, e arquivo que sobrar
  // não tem mais nada apontando pra ele.
  try {
    await removerArquivos(artesSoltas.map((arte) => arte.imagemUrl));
  } catch (erro) {
    console.error('[auth] sobra de arquivo na exclusao de conta:', erro instanceof Error ? erro.message : erro);
  }
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
