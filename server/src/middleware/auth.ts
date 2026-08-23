import type { FastifyReply, FastifyRequest } from 'fastify';
import { forbidden, unauthorized } from '../lib/http-error';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw unauthorized('Token ausente ou invalido');
  }
}

export async function requireAdmin(request: FastifyRequest, _reply: FastifyReply) {
  const user = request.user as { role?: string } | undefined;
  if (user?.role !== 'ADMIN') {
    throw forbidden('Acao restrita ao admin');
  }
}
