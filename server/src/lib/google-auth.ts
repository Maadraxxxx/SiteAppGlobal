import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { badRequest, unauthorized } from './http-error';

let client: OAuth2Client | undefined;

function getClient() {
  if (!client) client = new OAuth2Client();
  return client;
}

/** Todos os client IDs que aceitamos como destinatário do token (web, iOS, Android). */
function audiencias() {
  return [env.GOOGLE_CLIENT_ID_WEB, env.GOOGLE_CLIENT_ID_IOS, env.GOOGLE_CLIENT_ID_ANDROID].filter(
    (id): id is string => !!id,
  );
}

export interface PerfilGoogle {
  googleId: string;
  email: string;
  nome: string;
  avatarUrl?: string;
}

/**
 * Confere o id_token com o Google e devolve o perfil.
 *
 * A verificação é obrigatória: o token chega pelo app, então sem checar a
 * assinatura qualquer um poderia forjar um e entrar como outra pessoa. A
 * biblioteca valida assinatura, validade e se o token foi emitido pra um dos
 * nossos client IDs.
 */
export async function verificarIdToken(idToken: string): Promise<PerfilGoogle> {
  const audience = audiencias();
  if (!audience.length) {
    throw badRequest('Login com Google ainda nao configurado — falta GOOGLE_CLIENT_ID_WEB no servidor.');
  }

  let payload;
  try {
    const ticket = await getClient().verifyIdToken({ idToken, audience });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized('Login com Google invalido ou expirado');
  }

  if (!payload?.sub || !payload.email) {
    throw unauthorized('O Google nao devolveu os dados da conta');
  }

  // Sem e-mail verificado não dá pra ligar a uma conta existente pelo e-mail:
  // alguém poderia criar uma conta Google com o e-mail de outra pessoa.
  if (!payload.email_verified) {
    throw unauthorized('Essa conta Google esta com o e-mail nao verificado');
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    nome: payload.name?.trim() || payload.email.split('@')[0],
    avatarUrl: payload.picture,
  };
}
