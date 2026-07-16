
## PAGOU — Etapa 1 (design, auth, banco, UI)

Plataforma brasileira de venda de ingressos, cursos e produtos digitais. Esta etapa entrega toda a fundação visual e estrutural, com dados fictícios de demonstração. Integração real com Mercado Pago fica para etapa futura.

### Escopo desta etapa

**Sim:**
- Identidade visual completa (fintech moderna, verde vibrante + grafite + branco).
- Ativar Lovable Cloud (banco Postgres + autenticação + edge functions).
- Autenticação: e-mail/senha + Google.
- Schema completo com RLS em todas as tabelas.
- Seed com dados fictícios (eventos, cursos, produtores) para demonstração.
- Todas as páginas públicas, checkout visual, área do comprador, painel do produtor, check-in mobile, painel admin.
- QR codes gerados no frontend a partir do código do ingresso (validação real no backend depois).

**Não nesta etapa:**
- Integração real com Mercado Pago (checkout mostra PIX/cartão mas não processa).
- Emissão fiscal, e-mails transacionais, webhooks reais.
- Player de vídeo real dos cursos (mostra estrutura de módulos/aulas).

### Design system

- Fundo: branco / cinza neutro muito claro; superfícies em branco puro.
- Primária: verde vibrante (accent de fintech, tipo #00D26A) com variante escura.
- Grafite quase preto para texto e superfícies escuras (hero, painéis).
- Tipografia: uma display forte (Space Grotesk) + sans limpa (Inter).
- Cards com bordas suaves, sombras discretas, muito espaço em branco.
- Todos os tokens em `src/styles.css` (oklch). Zero cores hardcoded em componentes.

### Rotas

Públicas:
- `/` — home (banner, busca, filtros, destaques, mais vendidos, CTA produtor, rodapé)
- `/eventos`, `/eventos/$id`
- `/cursos`, `/cursos/$id`
- `/vender` — landing para produtores
- `/auth` — login/cadastro (email/senha + Google)
- `/checkout/$orderId` — checkout visual

Autenticadas (`/_authenticated/`):
- `/minhas-compras` — pedidos, ingressos (QR), cursos, downloads, perfil
- `/produtor` — dashboard, eventos, cursos, lotes, cupons, participantes, relatórios
- `/checkin` — leitor QR mobile (equipe de check-in)
- `/admin` — aprovações, usuários, pedidos, taxas, reembolsos, logs

### Banco de dados (Lovable Cloud)

Tabelas conforme spec: `profiles`, `user_roles` (enum `app_role`: buyer, seller, admin, checkin), `seller_accounts`, `products`, `events`, `courses`, `course_modules`, `course_lessons`, `ticket_types`, `ticket_batches`, `orders`, `order_items`, `payments`, `tickets`, `checkins`, `enrollments`, `coupons`, `coupon_uses`, `platform_fees`, `refunds`, `audit_logs`.

Regras chave:
- Roles em tabela separada + função `has_role` security definer (nunca em `profiles`).
- RLS em todas as tabelas + GRANTs explícitos.
- Compradores veem só seus pedidos/ingressos/matrículas.
- Vendedores veem só seus produtos/vendas (via `seller_accounts.user_id`).
- Check-in scoped por evento autorizado.
- Admin via `has_role(uid, 'admin')`.
- Trigger auto-cria `profiles` + role `buyer` no signup.

### Segurança preparada para etapa 2

- Preços/taxas serão recalculados em edge function no checkout real.
- Tabela `audit_logs` já registra ações sensíveis (mock nesta etapa).
- QR do ingresso gerado só quando `payments.status = 'approved'`.
- Estrutura para webhook do MP pronta (rota `/api/public/webhooks/mercadopago` fica para próxima etapa).

### Entregável final

App navegável ponta a ponta com dados fictícios: dá para logar, "comprar" um ingresso, ver o QR na área do comprador, simular check-in, e navegar por todos os painéis. Depois é só plugar Mercado Pago.
