import { Fonts, Spacing } from './theme';

/**
 * Cabeçalho de todas as telas com seta de voltar.
 *
 * Nasceu do Catálogo, onde o título é desenhado dentro da tela: seta e título
 * colados à esquerda, no mesmo tipo de letra dos títulos do app, sem a linha
 * divisória que o cabeçalho nativo traz de fábrica. Fica aqui, e não repetido
 * em cada Stack, pra as duas pilhas (raiz e admin) não saírem diferentes.
 */
export const CABECALHO = {
  headerTitleAlign: 'left' as const,
  headerTitleStyle: {
    fontFamily: Fonts.brand,
    // O mesmo 26 do "subtitle", que é o tamanho do título do Catálogo.
    fontSize: 26,
  },
  // Tira o risco cinza embaixo — o Catálogo não tem, e ele separava o
  // cabeçalho do conteúdo como se fossem duas telas.
  headerShadowVisible: false,
  // A seta nasce colada na borda; o mesmo recuo lateral do conteúdo das telas
  // faz ela cair na mesma coluna do Catálogo, em vez de mais pra fora.
  headerLeftContainerStyle: { paddingLeft: Spacing.four },
};
