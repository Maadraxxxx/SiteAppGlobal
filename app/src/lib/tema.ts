/**
 * O tema guardado é a frase inteira que o cliente escreveu no chat — e assim
 * tem que ser, porque é ela que vira o prompt da imagem: quanto mais contexto,
 * melhor a arte. Mas na etiqueta do carrinho e do pedido isso vira
 * "Tema: quero de natal", quando o que interessa ali é "Natal".
 *
 * Aqui a frase é aparada só para exibição. O texto original continua no banco,
 * intacto, e é ele que a IA usa.
 */

/**
 * Palavras de abertura que não dizem nada sobre o tema. Removidas em sequência
 * a partir do começo, então "quero de natal" perde "quero" e depois "de".
 */
const RUIDO_NO_COMECO = [
  'por favor',
  'eu quero',
  'quero',
  'queria',
  'gostaria de',
  'gostaria',
  'preciso de',
  'preciso',
  'me ve',
  'me vê',
  'faz',
  'faça',
  'faca',
  'cria',
  'crie',
  'criar',
  'monta',
  'coloca',
  'coloque',
  'poe',
  'põe',
  'bota',
  'no tema',
  'com tema',
  'tema',
  'no estilo',
  'com estilo',
  'estilo',
  'um',
  'uma',
  'uns',
  'umas',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'com',
  'para',
  'pra',
  'pro',
  'em',
  'no',
  'na',
  'o',
  'a',
  'os',
  'as',
];

/** Etiqueta de uma linha: passa disso e a frase é cortada numa palavra inteira. */
const LIMITE = 38;

function semAcento(texto: string) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Transforma a frase do cliente numa etiqueta curta.
 *
 * "quero de natal"                 -> "Natal"
 * "faz um halloween roxo"          -> "Halloween roxo"
 * "tema de aniversário infantil"   -> "Aniversário infantil"
 */
export function rotuloDoTema(tema: string) {
  const original = tema.trim();
  if (!original) return original;

  let resto = original.replace(/[.!?,;]+$/, '');

  // Tira uma abertura por vez, do começo. O laço repete porque elas vêm
  // empilhadas: "quero" + "um" + "tema" + "de".
  let cortou = true;
  while (cortou) {
    cortou = false;
    const comparavel = semAcento(resto.toLowerCase());
    for (const ruido of RUIDO_NO_COMECO) {
      const alvo = semAcento(ruido);
      // A borda importa: sem ela "das" comeria o começo de "dashboard", e "a"
      // transformaria "azul" em "zul".
      if (comparavel === alvo || comparavel.startsWith(`${alvo} `)) {
        resto = resto.slice(ruido.length).trimStart();
        cortou = true;
        break;
      }
    }
  }

  // Só sobrou enchimento: melhor mostrar a frase original do que nada.
  if (!resto) resto = original;

  if (resto.length > LIMITE) {
    const cortado = resto.slice(0, LIMITE);
    const ultimoEspaco = cortado.lastIndexOf(' ');
    resto = `${(ultimoEspaco > LIMITE / 2 ? cortado.slice(0, ultimoEspaco) : cortado).trimEnd()}…`;
  }

  // Só a primeira letra: deixar tudo em maiúscula de palavra ("Aniversário
  // Infantil Azul") parece título de anúncio, não etiqueta.
  return resto.charAt(0).toUpperCase() + resto.slice(1);
}
