import { createPublicKey, sign, verify } from 'node:crypto';
import { env } from '../config/env';
import { badRequest, unauthorized } from './http-error';

const EMISSOR = 'https://appleid.apple.com';

/** As chaves da Apple mudam raramente; uma hora de cache poupa uma ida por login. */
const VALIDADE_DAS_CHAVES_MS = 60 * 60 * 1000;

/** Uma chave publica da Apple, no formato JWK em que ela publica. */
export interface ChaveApple {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

export interface PerfilApple {
  appleId: string;
  /** So vem quando a Apple confirma o e-mail. Pode ser o endereco "oculto" dela. */
  email?: string;
  /** Pra qual app o token foi emitido — e o mesmo valor que a revogacao exige. */
  audiencia: string;
}

let cache: { chaves: ChaveApple[]; em: number } | undefined;

async function buscarChavesNaApple(): Promise<ChaveApple[]> {
  const res = await fetch(`${EMISSOR}/auth/keys`);
  if (!res.ok) throw new Error(`A Apple respondeu ${res.status} ao pedir as chaves`);
  const { keys } = (await res.json()) as { keys: ChaveApple[] };
  return keys;
}

async function chavesEmCache(forcar: boolean) {
  if (!forcar && cache && Date.now() - cache.em < VALIDADE_DAS_CHAVES_MS) return cache.chaves;
  cache = { chaves: await buscarChavesNaApple(), em: Date.now() };
  return cache.chaves;
}

/** Os apps aceitos como destinatario do token. Em producao, so o nosso. */
function audiencias() {
  return env.APPLE_CLIENT_IDS.split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function lerParte<T>(parte: string): T {
  return JSON.parse(Buffer.from(parte, 'base64url').toString('utf8')) as T;
}

interface OpcoesDeVerificacao {
  /** De onde vem as chaves. So os testes trocam isto, pra nao depender da Apple. */
  buscarChaves?: () => Promise<ChaveApple[]>;
  /** "Agora" em milissegundos, pelo mesmo motivo. */
  agora?: number;
}

/**
 * Confere o token do "Entrar com Apple" e devolve quem e a pessoa.
 *
 * A verificacao e obrigatoria pelo mesmo motivo do Google: o token chega pelo
 * app, entao sem checar a assinatura qualquer um poderia forjar um e entrar
 * como outra pessoa. Sao quatro conferencias, e todas precisam passar:
 * assinatura feita por uma chave da Apple, emissor Apple, destinatario um app
 * nosso, e validade.
 *
 * A do destinatario e a que mais importa e a menos obvia. O Expo Go e um app
 * da Expo: um token tirado nele e legitimo, assinado pela Apple, e traz o
 * e-mail da pessoa. Aceita-lo aqui deixaria qualquer projeto aberto no Expo Go
 * entrar na conta de quem fizesse login nele.
 */
export async function verificarIdentityToken(
  identityToken: string,
  opcoes: OpcoesDeVerificacao = {},
): Promise<PerfilApple> {
  const invalido = () => unauthorized('Login com a Apple inválido ou expirado');

  const partes = identityToken.split('.');
  if (partes.length !== 3) throw invalido();
  const [cabecalhoB64, corpoB64, assinaturaB64] = partes;

  let cabecalho: { kid?: string; alg?: string };
  let corpo: {
    iss?: string;
    aud?: string;
    exp?: number;
    sub?: string;
    email?: string;
    email_verified?: boolean | string;
  };
  try {
    cabecalho = lerParte(cabecalhoB64);
    corpo = lerParte(corpoB64);
  } catch {
    throw invalido();
  }

  // O algoritmo e fixado aqui, e nao lido do token: aceitar o que o token diz
  // e a porta classica pra trocar a verificacao por uma mais fraca.
  if (cabecalho.alg !== 'RS256' || !cabecalho.kid) throw invalido();

  const buscar = opcoes.buscarChaves;
  let chaves = buscar ? await buscar() : await chavesEmCache(false);
  let chave = chaves.find((c) => c.kid === cabecalho.kid);
  // A Apple gira as chaves de tempos em tempos. Chave desconhecida pode ser
  // so cache velho, entao vale buscar de novo uma vez antes de recusar.
  if (!chave && !buscar) {
    chaves = await chavesEmCache(true);
    chave = chaves.find((c) => c.kid === cabecalho.kid);
  }
  if (!chave) throw invalido();

  const assinaturaConfere = verify(
    'RSA-SHA256',
    Buffer.from(`${cabecalhoB64}.${corpoB64}`),
    createPublicKey({ key: { kty: chave.kty, n: chave.n, e: chave.e }, format: 'jwk' }),
    Buffer.from(assinaturaB64, 'base64url'),
  );
  if (!assinaturaConfere) throw invalido();

  if (corpo.iss !== EMISSOR) throw invalido();
  if (!corpo.aud || !audiencias().includes(corpo.aud)) throw invalido();

  const agora = opcoes.agora ?? Date.now();
  if (!corpo.exp || corpo.exp * 1000 <= agora) throw invalido();
  if (!corpo.sub) throw invalido();

  // A Apple manda `email_verified` ora como booleano, ora como texto.
  const emailConfirmado = corpo.email_verified === true || corpo.email_verified === 'true';

  return {
    appleId: corpo.sub,
    email: corpo.email && emailConfirmado ? corpo.email.toLowerCase() : undefined,
    audiencia: corpo.aud,
  };
}

/**
 * A revogacao so funciona com a chave gerada no painel de desenvolvedor da
 * Apple. Sem ela o login funciona igual — so nao da pra avisar a Apple quando
 * a conta e excluida.
 */
export function revogacaoConfigurada() {
  return !!(env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY);
}

/**
 * O "segredo" que a Apple exige nao e uma senha fixa: e um token curto que
 * nos mesmos assinamos com a chave privada, provando que somos o dono do app.
 */
function segredoDoCliente(clientId: string) {
  const agora = Math.floor(Date.now() / 1000);
  const codificar = (dado: object) => Buffer.from(JSON.stringify(dado)).toString('base64url');

  const cabecalho = codificar({ alg: 'ES256', kid: env.APPLE_KEY_ID });
  const corpo = codificar({
    iss: env.APPLE_TEAM_ID,
    iat: agora,
    exp: agora + 5 * 60,
    aud: EMISSOR,
    sub: clientId,
  });

  // No painel da Vercel a chave costuma ser colada numa linha so, com "\n"
  // escrito por extenso no lugar das quebras.
  const chavePrivada = (env.APPLE_PRIVATE_KEY as string).replace(/\\n/g, '\n');

  // ieee-p1363 e o formato de assinatura que o JWT usa; o padrao do Node (DER)
  // gera uma assinatura valida que a Apple recusa.
  const assinatura = sign('sha256', Buffer.from(`${cabecalho}.${corpo}`), {
    key: chavePrivada,
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');

  return `${cabecalho}.${corpo}.${assinatura}`;
}

async function chamarApple(caminho: string, campos: Record<string, string>) {
  return fetch(`${EMISSOR}${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(campos).toString(),
  });
}

/**
 * Troca o codigo do login pelo token de longa duracao. A Apple so entrega
 * esse codigo no momento do login e ele vale poucos minutos — por isso a
 * troca acontece ali, e o resultado fica guardado pra quando a conta for
 * excluida.
 */
export async function trocarCodigoPorRefreshToken(authorizationCode: string, clientId: string) {
  if (!revogacaoConfigurada()) return undefined;

  const res = await chamarApple('/auth/token', {
    client_id: clientId,
    client_secret: segredoDoCliente(clientId),
    code: authorizationCode,
    grant_type: 'authorization_code',
  });
  if (!res.ok) throw new Error(`A Apple recusou a troca do codigo: ${res.status} ${await res.text()}`);

  const { refresh_token: refreshToken } = (await res.json()) as { refresh_token?: string };
  return refreshToken;
}

/** Avisa a Apple que a conta acabou: o app some da lista "Entrar com Apple" do cliente. */
export async function revogarAcesso(refreshToken: string) {
  if (!revogacaoConfigurada()) {
    throw badRequest('Revogação da Apple não configurada no servidor');
  }

  // O token foi emitido pro app de producao, que e o primeiro da lista.
  const clientId = audiencias()[0];
  const res = await chamarApple('/auth/revoke', {
    client_id: clientId,
    client_secret: segredoDoCliente(clientId),
    token: refreshToken,
    token_type_hint: 'refresh_token',
  });
  if (!res.ok) throw new Error(`A Apple recusou a revogacao: ${res.status} ${await res.text()}`);
}
