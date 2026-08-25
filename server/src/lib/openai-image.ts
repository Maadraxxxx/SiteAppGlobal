import { env } from '../config/env';
import { badRequest } from './http-error';
import { uploadProdutoImagem } from './supabase-storage';

function assertConfigured() {
  if (!env.OPENAI_API_KEY) {
    throw badRequest('Gerador de IA ainda nao configurado — falta OPENAI_API_KEY no servidor.');
  }
}

/** Formatos que a API de edicao de imagem aceita. */
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];

function montarPrompt(tema: string) {
  return (
    `Adapte esta decoracao de festa para o tema pedido pelo cliente: "${tema}". ` +
    'Mantenha o mesmo formato e composicao geral da peca (e um painel/produto de decoracao ' +
    'de festa) — troque apenas cores, elementos e estilo visual para refletir o tema pedido. ' +
    'Nao transforme em uma cena ou objeto diferente do original. ' +
    'Nao inclua texto, letras, numeros nem marca d agua na imagem.'
  );
}

export async function gerarImagemComTema(imagemUrl: string, tema: string): Promise<string> {
  assertConfigured();

  const imagemOriginal = await fetch(imagemUrl);
  if (!imagemOriginal.ok) {
    throw new Error(`Falha ao baixar imagem original do produto: ${imagemOriginal.status}`);
  }
  const imagemBuffer = Buffer.from(await imagemOriginal.arrayBuffer());

  // O tipo precisa ir junto: Blob sem `type` vira application/octet-stream e a
  // OpenAI recusa. Vem do proprio Content-Type do arquivo no Storage, com png
  // como reserva caso o servidor nao informe.
  const tipoBruto = imagemOriginal.headers.get('content-type') ?? 'image/png';
  const tipo = TIPOS_ACEITOS.includes(tipoBruto) ? tipoBruto : 'image/png';
  const extensao = tipo.split('/')[1];

  const formData = new FormData();
  // gpt-image-2 e o atual e nao tem data de desligamento; o gpt-image-1 sai
  // de circulacao em 23/10/2026.
  formData.append('model', 'gpt-image-2');
  formData.append('image', new Blob([imagemBuffer], { type: tipo }), `produto.${extensao}`);
  formData.append('prompt', montarPrompt(tema));

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Falha ao gerar imagem com IA: ${res.status} ${text}`);
  }

  const data = (await res.json()) as { data: Array<{ b64_json: string }> };
  const base64 = data.data[0]?.b64_json;
  if (!base64) {
    throw new Error('Resposta da IA nao trouxe imagem');
  }

  const buffer = Buffer.from(base64, 'base64');
  return uploadProdutoImagem(buffer, `tema-${Date.now()}.png`, 'image/png');
}
