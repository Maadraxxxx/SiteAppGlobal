import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: 'CLIENTE' | 'ADMIN' };
    user: { sub: string; role: 'CLIENTE' | 'ADMIN' };
  }
}
