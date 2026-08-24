import { prisma } from '../../db/prisma';
import { badRequest, notFound } from '../../lib/http-error';
import { apenasDigitos, cepValido } from '../../lib/melhor-envio';

export interface EnderecoEntrada {
  apelido?: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  principal?: boolean;
}

export function listar(usuarioId: string) {
  return prisma.endereco.findMany({
    where: { usuarioId },
    orderBy: [{ principal: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function get(id: string, usuarioId: string) {
  const endereco = await prisma.endereco.findUnique({ where: { id } });
  if (!endereco || endereco.usuarioId !== usuarioId) throw notFound('Endereco nao encontrado');
  return endereco;
}

function normalizar(entrada: EnderecoEntrada) {
  if (!cepValido(entrada.cep)) throw badRequest('CEP invalido');
  return {
    apelido: entrada.apelido?.trim() || null,
    cep: apenasDigitos(entrada.cep),
    logradouro: entrada.logradouro.trim(),
    numero: entrada.numero.trim(),
    complemento: entrada.complemento?.trim() || null,
    bairro: entrada.bairro.trim(),
    cidade: entrada.cidade.trim(),
    uf: entrada.uf.trim().toUpperCase().slice(0, 2),
  };
}

/** So um endereco por usuario fica marcado como principal. */
async function desmarcarOutros(usuarioId: string, exceto?: string) {
  await prisma.endereco.updateMany({
    where: { usuarioId, principal: true, ...(exceto ? { id: { not: exceto } } : {}) },
    data: { principal: false },
  });
}

export async function criar(usuarioId: string, entrada: EnderecoEntrada) {
  const dados = normalizar(entrada);
  // O primeiro endereco vira principal sozinho, senao o checkout abriria sem nada escolhido.
  const jaTem = await prisma.endereco.count({ where: { usuarioId } });
  const principal = entrada.principal ?? jaTem === 0;

  if (principal) await desmarcarOutros(usuarioId);

  return prisma.endereco.create({ data: { ...dados, principal, usuarioId } });
}

export async function atualizar(id: string, usuarioId: string, entrada: EnderecoEntrada) {
  await get(id, usuarioId);
  const dados = normalizar(entrada);

  if (entrada.principal) await desmarcarOutros(usuarioId, id);

  return prisma.endereco.update({
    where: { id },
    data: { ...dados, ...(entrada.principal !== undefined ? { principal: entrada.principal } : {}) },
  });
}

export async function remover(id: string, usuarioId: string) {
  const endereco = await get(id, usuarioId);
  await prisma.endereco.delete({ where: { id } });

  // Sobrou algum sem principal? Promove o mais recente pra nao ficar nenhum marcado.
  if (endereco.principal) {
    const proximo = await prisma.endereco.findFirst({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
    });
    if (proximo) {
      await prisma.endereco.update({ where: { id: proximo.id }, data: { principal: true } });
    }
  }
}

interface RespostaViaCep {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

/** Consulta o ViaCEP pra preencher o endereco sozinho. E aberto e sem chave. */
export async function buscarPorCep(cep: string) {
  const digitos = apenasDigitos(cep);
  if (digitos.length !== 8) throw badRequest('CEP invalido');

  const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
  if (!res.ok) throw new Error(`ViaCEP respondeu ${res.status}`);

  const dados = (await res.json()) as RespostaViaCep;
  if (dados.erro) throw notFound('CEP nao encontrado');

  return {
    cep: digitos,
    logradouro: dados.logradouro ?? '',
    bairro: dados.bairro ?? '',
    cidade: dados.localidade ?? '',
    uf: dados.uf ?? '',
  };
}
