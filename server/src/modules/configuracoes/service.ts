import { prisma } from '../../db/prisma';

/** A tabela tem uma linha so, e este e o id dela. */
const UNICA = 'unica';

/**
 * Le os ajustes da loja. Cria a linha se ela nao existir — banco restaurado de
 * backup antigo, ou seed rodado antes desta tabela existir, cairiam num
 * "configuracao nao encontrada" que nao ajuda ninguem.
 */
export async function getConfiguracao() {
  return prisma.configuracaoApp.upsert({
    where: { id: UNICA },
    update: {},
    create: { id: UNICA },
  });
}

export interface ConfiguracaoInput {
  introVideoUrl?: string | null;
  introVideoAtivo?: boolean;
}

export async function atualizarConfiguracao(input: ConfiguracaoInput) {
  return prisma.configuracaoApp.upsert({
    where: { id: UNICA },
    update: input,
    create: { id: UNICA, ...input },
  });
}
