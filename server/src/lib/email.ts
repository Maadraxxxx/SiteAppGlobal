import { env } from '../config/env';

/**
 * Envio de e-mail da loja.
 *
 * Usa a API do Resend por HTTP, sem biblioteca: e uma requisicao so, e SMTP
 * em funcao serverless da problema — a conexao fica aberta esperando o
 * handshake e a funcao morre antes.
 *
 * Trocar de provedor mexe so neste arquivo: o resto do servidor conhece
 * apenas `enviarEmail`.
 */

export interface Email {
  para: string;
  assunto: string;
  html: string;
  /** Alternativa em texto puro, pra cliente de e-mail que nao renderiza HTML. */
  texto: string;
}

export function emailConfigurado() {
  return !!env.RESEND_API_KEY;
}

export async function enviarEmail({ para, assunto, html, texto }: Email) {
  if (!env.RESEND_API_KEY) {
    // Nao e erro de quem chamou: e configuracao faltando no servidor. Quem
    // chama decide o que fazer — no "esqueci minha senha", por exemplo, a
    // resposta ao cliente e a mesma com ou sem envio.
    throw new Error('RESEND_API_KEY nao configurada — nenhum e-mail foi enviado.');
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_REMETENTE,
      to: [para],
      subject: assunto,
      html,
      text: texto,
    }),
  });

  if (!res.ok) {
    const corpo = await res.text();
    throw new Error(`Falha ao enviar e-mail: ${res.status} ${corpo}`);
  }
}

/** Molde simples e com boa leitura em cliente de e-mail antigo — sem CSS externo. */
export function moldeRecuperacao(nome: string, link: string, minutos: number) {
  const html = `
<div style="font-family: Arial, Helvetica, sans-serif; color: #211714; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin: 0 0 16px;">Redefinir sua senha</h1>
  <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
    Olá, ${nome}. Recebemos um pedido para trocar a senha da sua conta na Global Decora.
  </p>
  <p style="margin: 0 0 24px;">
    <a href="${link}"
       style="display: inline-block; background: #FA4F17; color: #FFFFFF; text-decoration: none;
              padding: 12px 24px; border-radius: 999px; font-weight: bold; font-size: 15px;">
      Criar uma nova senha
    </a>
  </p>
  <p style="font-size: 13px; line-height: 1.5; color: #6B5A54; margin: 0 0 8px;">
    O link vale por ${minutos} minutos e só pode ser usado uma vez.
  </p>
  <p style="font-size: 13px; line-height: 1.5; color: #6B5A54; margin: 0;">
    Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.
  </p>
</div>`.trim();

  const texto = [
    `Olá, ${nome}.`,
    '',
    'Recebemos um pedido para trocar a senha da sua conta na Global Decora.',
    'Abra o endereço abaixo para criar uma nova:',
    '',
    link,
    '',
    `O link vale por ${minutos} minutos e só pode ser usado uma vez.`,
    'Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.',
  ].join('\n');

  return { html, texto };
}
