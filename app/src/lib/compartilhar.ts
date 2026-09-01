import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

/**
 * Endereço público do site, usado pra montar o link compartilhado quando o app
 * roda no celular — lá não existe barra de endereços de onde tirar a URL.
 * Configurado em app/.env como EXPO_PUBLIC_SITE_URL.
 */
const SITE = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, '');

/**
 * Link que o destinatário consegue abrir. Na web é a própria página onde a
 * pessoa está; no celular é montado a partir do endereço do site, porque um
 * link `globaldecora://` só abriria pra quem já tem o app instalado — e quem
 * recebe um compartilhamento normalmente não tem.
 */
export function linkDoProduto(produtoId: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/produto/${produtoId}`;
  }
  return SITE ? `${SITE}/produto/${produtoId}` : undefined;
}

export type ResultadoCompartilhar = 'compartilhado' | 'copiado' | 'cancelado';

/**
 * Abre o compartilhamento nativo do aparelho (WhatsApp, Instagram, e-mail...).
 *
 * No navegador nem todo lugar tem o menu de compartilhar — Chrome no desktop,
 * por exemplo, não tem. Nesses casos o link vai pra área de transferência, que
 * resolve a mesma necessidade sem deixar o botão morto.
 */
export async function compartilharProduto(
  nome: string,
  produtoId: string,
): Promise<ResultadoCompartilhar> {
  const link = linkDoProduto(produtoId);
  const texto = link ? `${nome} — Global Decora\n${link}` : `${nome} — Global Decora`;

  if (Platform.OS === 'web') {
    const navegador = typeof navigator !== 'undefined' ? navigator : undefined;

    if (navegador?.share) {
      try {
        await navegador.share({ title: nome, text: `${nome} — Global Decora`, url: link });
        return 'compartilhado';
      } catch {
        // A pessoa fechou o menu. Não é erro, e cair pra cópia aqui seria
        // copiar sem ela pedir.
        return 'cancelado';
      }
    }

    await Clipboard.setStringAsync(texto);
    return 'copiado';
  }

  const resultado = await Share.share(link ? { message: texto, url: link } : { message: texto });
  return resultado.action === Share.sharedAction ? 'compartilhado' : 'cancelado';
}
