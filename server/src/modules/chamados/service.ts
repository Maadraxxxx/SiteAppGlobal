import type { Prisma, StatusChamado } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { forbidden, notFound } from '../../lib/http-error';

/** O que o cliente e o admin veem de um chamado na lista. */
const resumo = {
  id: true,
  assunto: true,
  status: true,
  pedidoId: true,
  createdAt: true,
  updatedAt: true,
  usuario: { select: { id: true, nome: true, email: true } },
  mensagens: {
    // Só a última, pra lista mostrar a prévia sem carregar a conversa inteira.
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { texto: true, autor: true, createdAt: true },
  },
  _count: { select: { mensagens: true } },
} satisfies Prisma.ChamadoSelect;

const completo = {
  ...resumo,
  mensagens: {
    orderBy: { createdAt: 'asc' },
    select: { id: true, texto: true, autor: true, createdAt: true },
  },
} satisfies Prisma.ChamadoSelect;

export async function listarDoCliente(usuarioId: string) {
  const items = await prisma.chamado.findMany({
    where: { usuarioId },
    select: resumo,
    // Conversa que mexeu por último em cima: é onde a resposta acabou de
    // chegar. O id desempata pra paginação não embaralhar.
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });
  return { items, total: items.length };
}

export interface ListarAdminFiltros {
  status?: StatusChamado;
}

export async function listarParaAdmin({ status }: ListarAdminFiltros) {
  const where: Prisma.ChamadoWhereInput = status ? { status } : {};

  const [items, abertos] = await Promise.all([
    prisma.chamado.findMany({
      where,
      select: resumo,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    }),
    // Quantos esperam a loja — é o número que o painel mostra.
    prisma.chamado.count({ where: { status: 'ABERTO' } }),
  ]);

  return { items, total: items.length, abertos };
}

/**
 * Um chamado com a conversa toda.
 *
 * `usuarioId` presente restringe ao dono: sem isso, trocar o id na URL leria
 * a conversa de outro cliente.
 */
export async function obter(id: string, usuarioId?: string) {
  const chamado = await prisma.chamado.findUnique({ where: { id }, select: completo });
  if (!chamado) throw notFound('Chamado nao encontrado');
  if (usuarioId && chamado.usuario.id !== usuarioId) {
    throw forbidden('Este chamado nao e seu');
  }
  return chamado;
}

export interface AbrirInput {
  assunto: string;
  mensagem: string;
  pedidoId?: string;
}

export async function abrir(usuarioId: string, { assunto, mensagem, pedidoId }: AbrirInput) {
  // O pedido informado tem que ser do próprio cliente: aceitar qualquer id
  // deixaria alguém anexar o pedido de outra pessoa ao próprio chamado.
  if (pedidoId) {
    const pedido = await prisma.pedido.findFirst({ where: { id: pedidoId, usuarioId } });
    if (!pedido) throw notFound('Pedido nao encontrado');
  }

  const chamado = await prisma.chamado.create({
    data: {
      usuarioId,
      assunto,
      pedidoId,
      mensagens: { create: { autor: 'CLIENTE', texto: mensagem } },
    },
    select: completo,
  });

  return chamado;
}

/**
 * Escreve na conversa.
 *
 * O status acompanha quem falou por último: cliente escreveu, a bola é da
 * loja; loja respondeu, é do cliente. Assim a fila do admin ("abertos") se
 * mantém sozinha, sem ninguém marcar nada.
 */
export async function responder(
  id: string,
  texto: string,
  autor: 'CLIENTE' | 'LOJA',
  usuarioId?: string,
) {
  await obter(id, usuarioId);

  await prisma.$transaction([
    prisma.mensagemChamado.create({ data: { chamadoId: id, autor, texto } }),
    prisma.chamado.update({
      where: { id },
      data: { status: autor === 'CLIENTE' ? 'ABERTO' : 'RESPONDIDO' },
    }),
  ]);

  return obter(id, usuarioId);
}

export async function definirStatus(id: string, status: StatusChamado) {
  await obter(id);
  await prisma.chamado.update({ where: { id }, data: { status } });
  return obter(id);
}
