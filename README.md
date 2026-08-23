# Global Decora

Loja online de decorações de festa com gerador de kits por IA. App único (Expo Router) rodando em iOS, Android e Web, backend em Node/Fastify, banco PostgreSQL.

**Esta é a etapa "Fundação + Catálogo"**: estrutura do projeto, autenticação, CRUD completo de categorias/produtos/formatos/estilos pelo admin, e navegação/catálogo básico pro cliente. Gerador de IA e pagamento (Mercado Pago) ainda não estão implementados — ver `.claude/plans` ou a seção "Próximas etapas" abaixo.

## Estrutura

```
app/               Expo Router (iOS + Android + Web)
server/            API Fastify + Prisma + PostgreSQL
packages/shared/   Tipos TypeScript compartilhados (sem runtime)
```

## Rodando localmente

Pré-requisitos: Node.js LTS (>= 20.19.4 — ver nota abaixo), uma connection string do PostgreSQL (ex: [neon.com](https://neon.com) ou [supabase.com](https://supabase.com), plano grátis).

1. Copie os arquivos de ambiente e preencha o que faltar:
   ```
   cp server/.env.example server/.env   # já existe um server/.env; só falta DATABASE_URL
   cp app/.env.example app/.env
   ```
   Em `server/.env`, defina `DATABASE_URL` com a connection string do seu Postgres.

2. Instale as dependências (raiz, cobre os 3 workspaces):
   ```
   npm install
   ```

3. Rode a primeira migration e o seed:
   ```
   npm run db:migrate
   npm run db:seed
   ```
   O seed cria um usuário admin e um cliente de teste — as credenciais aparecem no terminal (vêm de `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` em `server/.env`).

4. Suba backend + app juntos:
   ```
   npm run dev
   ```
   Pressione `w` no terminal do Expo pra abrir a versão web, ou escaneie o QR code com o app Expo Go.

### Nota sobre a versão do Node

Esta máquina tem Node v20.17.0, mas o React Native 0.86 (Expo SDK 57) pede `>=20.19.4`. O `npm install` funciona (com avisos `EBADENGINE`), mas se o Metro bundler (`expo start`) se comportar de forma estranha, atualize o Node para a LTS mais recente.

## Próximas etapas (fora desta primeira entrega)

Gerador de decoração com IA, checkout Mercado Pago (Pix + Cartão), fila de produção/acompanhamento de pedido, splash animado, integração da mascote, vídeo de destaque da Home, upload de imagem de produto, publicação nas lojas (EAS Build).
