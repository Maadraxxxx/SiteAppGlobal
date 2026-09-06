import * as Print from 'expo-print';
import { Platform } from 'react-native';

/**
 * Manda a etiqueta pra impressão.
 *
 * No celular o expo-print abre a folha de impressão do sistema com o PDF
 * remoto — é o caminho de uma etiqueta do Melhor Envio.
 *
 * Na web ele ignora a URL e imprimiria a página aberta, que aqui é o painel do
 * admin. Então lá o PDF é aberto numa aba, e quem imprime é o leitor do
 * navegador. Dá no mesmo pro admin e evita sair uma folha com a tela do app.
 */
export async function imprimirPdf(url: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
    return;
  }

  await Print.printAsync({ uri: url });
}

/**
 * Manda um HTML montado por nós pra impressão — o caso da etiqueta simulada.
 *
 * Na web o expo-print também ignora o `html` e imprime a página aberta, que
 * sairia com o cabeçalho e a barra do painel no meio da etiqueta. Por isso lá
 * o HTML vai pra uma janela própria, que imprime só ele.
 */
export async function imprimirHtml(html: string) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;

    const janela = window.open('', '_blank', 'width=720,height=900');
    if (!janela) throw new Error('O navegador bloqueou a janela de impressão.');

    janela.document.write(html);
    janela.document.close();
    // Espera o conteúdo assentar antes de chamar a impressão: sem isso o
    // diálogo abre com a folha ainda em branco.
    janela.onload = () => {
      janela.focus();
      janela.print();
    };
    return;
  }

  await Print.printAsync({ html });
}
