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

  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  throw new Error('Configuração de ambiente inválida — confira o arquivo .env');
}

export const env = parsed.data;
