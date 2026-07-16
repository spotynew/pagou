## PAGOU — Etapa 2: Segurança, Auth e Backend

Transformar o protótipo visual em app funcional e seguro, **preservando toda a identidade visual atual** (cores, tipografia, cards, header, home). Nada de layout muda.

### 1. Autenticação e roles (base de tudo)

- Manter enum `app_role` já existente (buyer, seller, admin, checkin) — renomear `seller`→`producer` via migração e adicionar `checkin_staff` (ou mapear `checkin`→`checkin_staff`).
- Reforçar trigger `handle_new_user` já existente.
- Criar rota-guarda `_authenticated/route.tsx` (gerenciada pela integração, redirect `/auth`).
- Layouts adicionais: `_authenticated/_producer.tsx` (produtor+admin), `_authenticated/_admin.tsx` (admin), `_authenticated/_checkin.tsx` (checkin_staff + admin + producer autorizado).
- Mover rotas atuais para dentro:
  - `/minhas-compras` → `_authenticated/minhas-compras`
  - `/produtor/*` → `_authenticated/_producer/produtor.*`
  - `/admin` → `_authenticated/_admin/admin`
  - `/checkin` → `_authenticated/_checkin/checkin`
- Página `/auth` já existe — manter visual, garantir email+senha + Google via broker `lovable`.
- Header já usa sessão — ampliar para mostrar rota conforme role.

### 2. Migração de banco

- Renomear/ajustar enum `app_role` para `('buyer','producer','checkin_staff','admin')`.
- Ajustar `orders` para incluir: `seller_id`, `payment_fee_cents`, `external_reference`, `expires_at`, `paid_at` (checar quais faltam).
- Ajustar `payments` para incluir: `provider_payment_id`, `pix_qr_code`, `pix_qr_code_base64`, `expires_at`, `raw_status`, `updated_at`.
- Criar tabela `stock_reservations` (order_id, ticket_batch_id, quantity, expires_at) OU coluna `reserved_until` no `order_items` — usarei tabela dedicada.
- Função SQL `expire_stale_reservations()` + `available_stock(batch_id)` que desconta reservas ativas.
- Reforçar RLS + GRANTs em todas as tabelas afetadas.
- Coluna `max_per_order` em `ticket_batches` (limite por comprador).
- Coluna `checkin_event_authorizations` (user_id, event_id) para autorizar equipe.

### 3. Checkout seguro (server-side)

- Nova URL: `/checkout?order_id=xxx` (só id).
- Server function `createDraftOrder({ items: [{product_id, ticket_batch_id, quantity}], coupon_code? })`:
  - `requireSupabaseAuth`.
  - Busca produto+lote no banco.
  - Valida disponibilidade (via `available_stock`), validade do lote, `max_per_order`, quantidade > 0.
  - Calcula subtotal, desconto (cupom), taxa (10%), total — tudo em centavos.
  - Cria `order` status `pending` com `expires_at = now()+15min`.
  - Cria `order_items`.
  - Cria `stock_reservations` com mesmo `expires_at`.
  - Retorna `{ order_id }`.
- Página checkout carrega pedido via server fn `getOrderForCheckout(order_id)` — pertence ao comprador, mostra valores calculados pelo backend.
- Botão "Finalizar" chama `confirmOrder({ order_id, payment_method })` que hoje só cria registro em `payments` mock (status `pending`) e simula fluxo Mercado Pago (retorna QR fake). Sem processar pagamento real.
- Páginas de evento/curso atualizadas para chamar `createDraftOrder` e navegar por `order_id`.

### 4. Estrutura Mercado Pago (preparada, não ativa)

Como TanStack Start não usa Supabase Edge Functions para lógica interna, os endpoints ficam como **server functions / server routes**:

- `src/lib/payments.functions.ts`:
  - `createMercadoPagoPayment({ order_id, payment_method })` — protegido, valida owner, recalcula tudo, gera idempotency key, salva `external_reference`. Corpo real comentado como TODO; retorna mock enquanto secrets não existem.
  - `getPaymentStatus({ order_id })` — protegido.
  - `requestRefund({ order_id })` — admin only.
- `src/routes/api/public/webhooks/mercadopago.ts` — verifica assinatura HMAC (secret), busca pagamento na API MP, valida valor, atualiza idempotente (checa `provider_payment_id` já processado), grava `audit_logs`. Enquanto secrets faltam, responde 503 explicando.
- Secrets pedidas ao usuário via `add_secret` **ao final**: `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_PUBLIC_KEY`, `MERCADO_PAGO_WEBHOOK_SECRET`. Explicar antes.

### 5. Liberação pós-pagamento

- Trigger SQL `on payments.status → 'approved'`:
  - Gera `tickets` (código aleatório 16 chars base32, único, não sequencial) para itens de evento.
  - Gera `enrollments` para itens de curso.
  - Marca `orders.status='paid'`, `paid_at=now()`.
  - Libera reserva (a reserva expira; estoque efetivo passa a contar via `tickets`).
- QR code: no frontend gerar QR contendo apenas `ticket.code` (não dados pessoais).
- Validação de acesso a curso: server fn `getCourseAccess({ course_id })` verifica enrollment ativo antes de retornar lessons.

### 6. Check-in seguro

- Server fn `validateTicket({ code, event_id })` protegida (`requireSupabaseAuth` + verificação de autorização):
  - Retorna `valid | already_used | cancelled | not_found | wrong_event`.
  - Insere em `checkins` de forma atômica (constraint unique em `ticket_id`).
  - Grava usuário validador + timestamp + evento.
- Página `/checkin` usa server fn — sem lógica de validação no cliente.

### 7. Ajustes públicos (só texto)

- Criar `/termos` e `/privacidade` com conteúdo real de placeholder legal.
- Rodapé: remover CNPJ fictício, colocar "PAGOU — plataforma em fase de lançamento".
- Remover horários fictícios tipo 16:57 (procurar e trocar por horários coerentes das seeds).
- Home / admin / painel: badge "Demonstração" onde exibe dados fictícios.
- Remover claims de "antifraude próprio".
- Trocar "Receba via PIX na hora" → "Venda por PIX e cartão".
- Manter seeds separadas (schema `demo` OU flag `is_demo` — usar flag `is_demo boolean` em products/events/courses e filtrar em produção via env `VITE_SHOW_DEMO`).

### 8. Detalhes técnicos

- Todos os valores monetários em **centavos** (int). Formatter `formatBRL` já divide por 100.
- Server fns em `src/lib/*.functions.ts` (nunca em `src/server/`).
- Middleware `attachSupabaseAuth` já registrada em `src/start.ts` (verificar).
- Nenhuma edge function Supabase nova — só server functions/routes TanStack.
- RLS: policies novas para `stock_reservations`, `checkin_event_authorizations`; ajustes em `orders`/`payments` para permitir INSERT via server fn autenticado com `auth.uid()=buyer_id`.

### Ordem de execução

1. Migração SQL (schema completo + RLS + funções).
2. Roles/route guards + mover rotas.
3. Server fns de checkout + estoque + cupom.
4. Refatorar páginas evento/curso/checkout para novo fluxo.
5. Server fns Mercado Pago (mock) + webhook route.
6. Trigger de liberação + QR frontend.
7. Server fn check-in.
8. Páginas legais + ajustes de texto público.
9. `add_secret` para chaves MP (pedir por último).

### O que **não** muda

Design tokens (`src/styles.css`), Header, Footer, EventCard, CourseCard, Home, tipografia, cores, sombras, layout de qualquer página existente.
