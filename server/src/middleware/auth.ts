import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/prisma';
import { forbidden, unauthorized } from '../lib/http-error';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw unauthorized('Token ausente ou invalido');
  }

  // O token vale por dias e não sabe que a conta foi excluída: sem esta
  // consulta, outro aparelho que ficou logado continuaria criando pedido e
  // endereço numa conta que o cliente mandou apagar. Custa uma leitura por
  // chave primária a cada requisição autenticada.
  const conta = await prisma.usuario.findUnique({
    where: { id: request.user.sub },
    select: { excluidaEm: true },
  });
  if (!conta || conta.excluidaEm) {
    throw unauthorized('Essa conta não existe mais');
  }
}

export async function requireAdmin(request: FastifyRequest, _reply: FastifyReply) {
  const user = request.user as { role?: string } | undefined;
  if (user?.role !== 'ADMIN') {
    throw forbidden('Acao restrita ao admin');
  }
}
