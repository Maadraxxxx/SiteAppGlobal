import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from '../src/app';

// Entrypoint pra rodar o Fastify como funcao serverless na Vercel — reaproveita
// o mesmo buildApp() usado localmente (src/index.ts so adiciona o app.listen()
// que nao existe aqui, a Vercel quem administra o ciclo de vida da requisicao).
const app = buildApp();
const ready = app.ready();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ready;
  app.server.emit('request', req, res);
}
