/**
 * Confirmação escrita para ações que não dá pra desfazer com um toque.
 *
 * Fica fora da tela pra poder ser testada sozinha: é a peça que decide se o
 * botão perigoso libera.
 */

/** O que a pessoa precisa escrever pra promover alguém a administrador. */
export const PALAVRA_CONFIRMAR = 'Confirmar';

function normalizar(texto: string) {
  return texto.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Aceita sem diferenciar maiúscula e acento: no teclado do celular exigir a
 * grafia exata só gera tentativa frustrada, e o que a confirmação existe pra
 * garantir — parar e digitar a palavra de propósito — já aconteceu.
 */
export function confirmacaoEscrita(escrito: string, palavra = PALAVRA_CONFIRMAR) {
  return normalizar(escrito) === normalizar(palavra);
}
