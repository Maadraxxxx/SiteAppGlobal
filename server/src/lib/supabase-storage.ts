import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { badRequest } from './http-error';

const BUCKET = 'produtos';
let bucketReady = false;

function assertConfigured() {
  if (!env.SUPA_URL || !env.SUPA_SERVICE_ROLE_KEY) {
    throw badRequest(
      'Upload de imagem ainda nao configurado — falta SUPA_URL/SUPA_SERVICE_ROLE_KEY no servidor.',
    );
  }
}

async function ensureBucket() {
  if (bucketReady) return;
  assertConfigured();

  const res = await fetch(`${env.SUPA_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPA_SERVICE_ROLE_KEY}`,
      apikey: env.SUPA_SERVICE_ROLE_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });

  if (!res.ok) {
    const text = await res.text();
    // "ja existe" pode vir como HTTP 409, ou como HTTP 400 com o codigo
    // semantico dentro do corpo (a API da Supabase nao e consistente aqui) —
    // ambos os casos deixam o bucket pronto pra uso, nao sao erro de verdade.
    const jaExiste = res.status === 409 || text.includes('BucketAlreadyExists') || text.includes('Duplicate');
    if (!jaExiste) {
      throw new Error(`Falha ao preparar bucket de imagens: ${res.status} ${text}`);
    }
  }

  bucketReady = true;
}

export async function uploadProdutoImagem(
  buffer: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  assertConfigured();
  await ensureBucket();

  const ext = filename.includes('.') ? filename.split('.').pop() : 'jpg';
  const path = `${randomUUID()}.${ext}`;

  const res = await fetch(`${env.SUPA_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPA_SERVICE_ROLE_KEY}`,
      apikey: env.SUPA_SERVICE_ROLE_KEY as string,
      'Content-Type': mimetype,
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao enviar imagem: ${res.status} ${text}`);
  }

  return `${env.SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * Pede pro Supabase uma URL de envio assinada, pra o arquivo ir do aparelho do
 * admin direto pro armazenamento.
 *
 * Vale a pena pelo tamanho: funcao serverless na Vercel corta o corpo da
 * requisicao em poucos megabytes, e video estoura isso facil. Passando por
 * fora, o limite deixa de existir — o servidor so autoriza e diz onde gravar.
 */
export async function criarUrlDeEnvio(filename: string) {
  assertConfigured();
  await ensureBucket();

  const ext = filename.includes('.') ? filename.split('.').pop() : 'mp4';
  const path = `${randomUUID()}.${ext}`;

  const res = await fetch(`${env.SUPA_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SUPA_SERVICE_ROLE_KEY}`,
      apikey: env.SUPA_SERVICE_ROLE_KEY as string,
      'Content-Type': 'application/json',
    },
    // O corpo vazio e obrigatorio: dizer que o conteudo e JSON e nao mandar
    // nada faz a Supabase recusar com "Body cannot be empty when content-type
    // is set to 'application/json'". Esta rota nao precisa de parametro
    // nenhum, mas precisa do objeto.
    body: '{}',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao autorizar envio: ${res.status} ${text}`);
  }

  // A resposta traz o caminho ja com o token na query.
  const { url } = (await res.json()) as { url: string };

  return {
    /** Pra onde o app envia o arquivo (PUT). */
    urlDeEnvio: `${env.SUPA_URL}/storage/v1${url.startsWith('/') ? url : `/${url}`}`,
    /** Endereco final e publico, o que fica salvo na configuracao. */
    urlPublica: `${env.SUPA_URL}/storage/v1/object/public/${BUCKET}/${path}`,
  };
}

/**
 * Apaga arquivos do armazenamento a partir das URLs publicas deles.
 *
 * Existe pela exclusao de conta: o bucket e publico, entao apagar so o
 * registro no banco deixaria a imagem no ar pra quem tivesse o endereco.
 * URL que nao e deste bucket e ignorada em vez de dar erro — quem chama passa
 * o que tem, sem precisar saber de onde cada arquivo veio.
 */
export async function removerArquivos(urls: string[]) {
  if (!env.SUPA_URL || !env.SUPA_SERVICE_ROLE_KEY) return;

  const prefixo = `${env.SUPA_URL}/storage/v1/object/public/${BUCKET}/`;
  const caminhos = urls.filter((url) => url.startsWith(prefixo)).map((url) => url.slice(prefixo.length));
  if (!caminhos.length) return;

  const res = await fetch(`${env.SUPA_URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${env.SUPA_SERVICE_ROLE_KEY}`,
      apikey: env.SUPA_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prefixes: caminhos }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao apagar arquivos: ${res.status} ${await res.text()}`);
  }
}
