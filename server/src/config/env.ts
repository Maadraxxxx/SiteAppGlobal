import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL é obrigatória (usada pelas migrations)'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter pelo menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  API_PORT: z.coerce.number().default(3333),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@globaldecora.com'),
  SEED_ADMIN_PASSWORD: z.string().min(6).default('changeme123'),
  SEED_CLIENTE_EMAIL: z.string().email().default('cliente@example.com'),
  SEED_CLIENTE_PASSWORD: z.string().min(6).default('changeme123'),

  // sem prefixo SUPABASE_ de propósito — a Vercel reserva esse prefixo pra
  // integração própria dela e recusa variáveis com esse nome
  SUPA_URL: z.string().optional(),
  SUPA_SERVICE_ROLE_KEY: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),

  // Access token de produção ou de teste do Mercado Pago (Checkout Transparente).
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional(),
  // Segredo da assinatura do webhook, no painel do MP. Sem ele o webhook aceita
  // qualquer chamada — em produção configure.
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional(),

  // Frete (Melhor Envio). O token é um "personal access token" gerado no painel
  // deles, com o escopo shipping-calculate.
  MELHOR_ENVIO_TOKEN: z.string().optional(),
  // Enquanto true usa o ambiente de testes (sandbox.melhorenvio.com.br), que não
  // gera cobrança nem etiqueta real.
  MELHOR_ENVIO_SANDBOX: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  // O Melhor Envio exige User-Agent com um contato — é regra da API deles.
  MELHOR_ENVIO_CONTATO: z.string().default('contato@globaldecora.com'),
  // CEP de onde as encomendas saem (a loja). Sem ele não dá pra cotar.
  FRETE_CEP_ORIGEM: z.string().optional(),

  // Login com Google. São os client IDs do Google Cloud (OAuth 2.0). O servidor
  // usa todos como destinatários aceitos ao conferir o token; o app usa o da
  // plataforma dele. Só o WEB é obrigatório pra funcionar no site.
  GOOGLE_CLIENT_ID_WEB: z.string().optional(),
  GOOGLE_CLIENT_ID_IOS: z.string().optional(),
  GOOGLE_CLIENT_ID_ANDROID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  throw new Error('Configuração de ambiente inválida — confira o arquivo .env');
}

export const env = parsed.data;
