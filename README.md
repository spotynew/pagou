# PAGOU

Plataforma de eventos, cursos e ingressos digitais.

## Arquitetura

- **Código e versionamento:** GitHub
- **Aplicação / CDN / Functions:** Vercel
- **Banco, autenticação e storage:** Supabase
- **Pagamentos:** Mercado Pago
- **Framework:** TanStack Start + React + Vite + Nitro
- **Runtime:** Node.js 24

O projeto não depende do Lovable para build, autenticação, execução ou deploy.

## Desenvolvimento local

Requisitos:

- Node.js 24
- npm

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Antes de enviar mudanças:

```bash
npm run typecheck
npm run lint:ci
npm run build
```

## Variáveis de ambiente

Nunca versione credenciais reais. Use `.env.local` localmente e Environment Variables da Vercel em Preview/Production.

### Públicas

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Somente servidor

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_ID`
- `DATABASE_URL`
- `MERCADO_PAGO_ENABLED`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `PAYMENTS_DEMO_MODE`

A `SUPABASE_SERVICE_ROLE_KEY` e as credenciais do Mercado Pago nunca podem aparecer em código cliente, logs públicos ou arquivos versionados.

## Pagamentos

O checkout online só é habilitado quando:

- `MERCADO_PAGO_ENABLED=true`;
- o Access Token é válido;
- o secret do webhook está configurado;
- `PAYMENTS_DEMO_MODE` não está ativo.

Mantenha pagamentos desabilitados até o fluxo sandbox ser validado de ponta a ponta: pedido → PIX → webhook → aprovação → emissão → estoque.

## Segurança

- RLS deve permanecer habilitado em todas as tabelas públicas expostas pelo Supabase.
- Operações administrativas usam código server-side e nunca a service role no navegador.
- APIs sensíveis devem validar autenticação, autorização, entrada e idempotência.
- A branch `main` deve receber alterações somente por Pull Request após CI verde.
- O deploy de Preview deve ser validado antes de promover para Production.

## Deploy

A Vercel deve usar o repositório `spotynew/pagou`, framework **TanStack Start** e Node.js **24.x**.

A aplicação possui headers de segurança em `vercel.json` e coleta de Core Web Vitals via Vercel Speed Insights.
