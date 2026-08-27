import { Linking, Platform } from 'react-native';

/**
 * No navegador o `Linking.openURL` do React Native vira
 * `window.open(url, '_blank', 'noopener')`, e o Safari do iPhone trata isso
 * como popup — bloqueia calado quando a chamada não está no gesto direto do
 * toque. Era por isso que "Baixar imagem" não fazia nada no iPhone.
 *
 * Um clique num `<a>` conta como navegação iniciada pelo usuário e passa pelo
 * bloqueio. No app nativo nada disso existe e o Linking resolve.
 */
function clicarEmLink(url: string, configurar: (a: HTMLAnchorElement) => void) {
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  configurar(a);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Baixa o arquivo sem sair da página. Depende do servidor mandar
 * `Content-Disposition: attachment` — o Storage do Supabase manda quando a URL
 * tem `?download=nome` (ver `urlDeDownload`). Sem aba nova, o cliente continua
 * exatamente onde estava.
 */
export function baixarArquivo(url: string, nomeArquivo?: string) {
  if (Platform.OS !== 'web') {
    void Linking.openURL(url);
    return;
  }

  clicarEmLink(url, (a) => {
    // Ignorado quando o arquivo é de outro domínio, mas custa nada e ajuda
    // onde vale.
    if (nomeArquivo) a.download = nomeArquivo;
  });
}

/**
 * Abre em aba nova. É o certo pra PDF (a etiqueta): o Safari mostra o visualizador,
 * de onde dá pra salvar ou imprimir, e o app continua aberto atrás.
 */
export function abrirEmNovaAba(url: string) {
  if (Platform.OS !== 'web') {
    void Linking.openURL(url);
    return;
  }

  clicarEmLink(url, (a) => {
    a.target = '_blank';
  });
}
