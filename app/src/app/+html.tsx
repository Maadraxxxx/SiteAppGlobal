import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Casca HTML de todas as páginas da versão web. É o único lugar onde dá pra
 * pôr tags no `<head>`, e é o que faz o site poder ser instalado na tela de
 * início do celular.
 *
 * Roda só no Node, na hora de gerar as páginas — nada aqui executa no
 * navegador, então não dá pra usar window, document nem hooks de estado.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Sem <title> aqui de proposito: o helmet do expo-router substitui o
            que estiver nesta tag. Hoje ele escreve um titulo vazio, e por isso
            a aba do navegador fica sem nome — problema separado deste arquivo.
            O nome na tela de inicio nao depende dele: vem da
            apple-mobile-web-app-title logo abaixo. */}
        <meta
          name="description"
          content="Painéis e kits de decoração de festa, com temas personalizados por IA."
        />

        {/* Manifesto: nome, cor e ícones de quando o site vira app instalado.
            É o que o Android usa, e o iOS 16.4+ também lê. */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FA4F17" />

        {/*
          O iPhone ignora o manifesto nas versões mais antigas e olha só estas
          tags. Sem a apple-touch-icon ele salva um retrato borrado da página
          como ícone; sem a "capable" o site abre dentro do Safari, com barra de
          endereço, em vez de abrir como app.
        */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        {/* O nome que fica embaixo do ícone na tela de início. */}
        <meta name="apple-mobile-web-app-title" content="Global Decora" />

        {/* O favicon nao entra aqui: o proprio Expo gera e injeta a tag a
            partir do web.favicon do app.json. */}

        {/*
          Sem isto o body rola junto com a lista e a rolagem fica dobrada.
          Ver: https://necolas.github.io/react-native-web/docs/setup/#root-element
        */}
        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: estiloDeFundo }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

// Pintado antes do app montar: sem isto o primeiro quadro pisca branco puro
// mesmo no tema escuro.
const estiloDeFundo = `
body { background-color: #FFFFFF; }
@media (prefers-color-scheme: dark) {
  body { background-color: #1C1310; }
}
`;
