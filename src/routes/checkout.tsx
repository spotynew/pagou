import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { formatBRL } from "@/lib/format";
import { ShieldCheck, QrCode, CreditCard, TicketPercent } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type CheckoutSearch = {
  type?: "event" | "course";
  id?: string;
  batch?: string;
  qty?: string;
  title?: string;
  price?: string;
};

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>): CheckoutSearch => ({
    type: s.type as any,
    id: s.id as string,
    batch: s.batch as string,
    qty: s.qty as string,
    title: s.title as string,
    price: s.price as string,
  }),
  head: () => ({ meta: [{ title: "Checkout — PAGOU" }] }),
  component: Checkout,
});

function Checkout() {
  const search = Route.useSearch();
  const qty = Number(search.qty ?? 1);
  const unit = Number(search.price ?? 0);
  const subtotal = qty * unit;
  const [coupon, setCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [accepted, setAccepted] = useState(false);

  const serviceFeeCents = useMemo(() => Math.round((subtotal - discount) * 0.1), [subtotal, discount]);
  const total = Math.max(0, subtotal - discount) + serviceFeeCents;

  const applyCoupon = () => {
    if (!coupon.trim()) return;
    if (coupon.toUpperCase() === "PAGOU10") {
      setDiscount(Math.round(subtotal * 0.1));
      toast.success("Cupom aplicado: 10% de desconto");
    } else {
      setDiscount(0);
      toast.error("Cupom inválido");
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted) return toast.error("Você precisa aceitar os termos.");
    toast.success("Pedido registrado! (demo) Redirecionando…");
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link> <span>/</span> <span className="text-foreground">Checkout</span>
        </div>
        <form onSubmit={onSubmit} className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold">Seus dados</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Nome completo" id="name" placeholder="Como está no documento" required />
                <Field label="CPF" id="cpf" placeholder="000.000.000-00" required />
                <Field label="E-mail" id="email" type="email" placeholder="voce@email.com" required />
                <Field label="Telefone" id="tel" placeholder="(11) 99999-9999" required />
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold">Cupom de desconto</h2>
              <div className="mt-4 flex gap-2">
                <div className="relative flex-1">
                  <TicketPercent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Ex.: PAGOU10" className="pl-9" />
                </div>
                <Button type="button" variant="outline" onClick={applyCoupon}>Aplicar</Button>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold">Forma de pagamento</h2>
              <RadioGroup value={method} onValueChange={(v) => setMethod(v as any)} className="mt-4 grid gap-3 sm:grid-cols-2">
                <PaymentOption id="pix" value="pix" icon={<QrCode className="h-5 w-5 text-primary" />} title="PIX" desc="Aprovação em segundos" />
                <PaymentOption id="card" value="card" icon={<CreditCard className="h-5 w-5 text-primary" />} title="Cartão de crédito" desc="Em até 12x" />
              </RadioGroup>

              {method === "card" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Número do cartão" id="cc" placeholder="0000 0000 0000 0000" />
                  <Field label="Nome no cartão" id="ccn" placeholder="Como está impresso" />
                  <Field label="Validade" id="ccv" placeholder="MM/AA" />
                  <Field label="CVV" id="cvv" placeholder="000" />
                </div>
              )}
              {method === "pix" && (
                <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-foreground/80">
                  Após confirmar, geraremos um QR Code PIX válido por 30 minutos. Nenhum pagamento é processado no navegador.
                </div>
              )}
            </section>

            <label className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-card">
              <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} className="mt-1" />
              <span className="text-sm text-muted-foreground">
                Li e concordo com os <a href="#" className="text-primary underline">termos de uso</a> e a <a href="#" className="text-primary underline">política de privacidade</a> da PAGOU.
              </span>
            </label>
          </div>

          {/* Order summary */}
          <aside className="md:sticky md:top-24 md:h-fit">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-elevated">
              <h2 className="font-display text-lg font-semibold">Resumo</h2>
              <div className="mt-4 rounded-xl bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{search.type === "course" ? "Curso" : "Evento"}</p>
                <p className="mt-1 font-semibold">{search.title ?? "Item"}</p>
                <p className="text-sm text-muted-foreground">Quantidade: {qty}</p>
              </div>
              <Separator className="my-5" />
              <SummaryRow label="Subtotal" value={formatBRL(subtotal)} />
              {discount > 0 && <SummaryRow label="Desconto" value={`- ${formatBRL(discount)}`} className="text-primary" />}
              <SummaryRow label="Taxa de serviço" value={formatBRL(serviceFeeCents)} />
              <Separator className="my-5" />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-bold">{formatBRL(total)}</span>
              </div>
              <Button type="submit" size="lg" className="mt-5 w-full rounded-xl">
                Finalizar compra
              </Button>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Todos os pagamentos passam por Edge Functions seguras.
              </div>
            </div>
          </aside>
        </form>
      </div>
    </SiteShell>
  );
}

function Field({ label, id, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...rest} />
    </div>
  );
}

function PaymentOption({ id, value, icon, title, desc }: { id: string; value: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-all hover:border-primary/60 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
      <RadioGroupItem value={value} id={id} className="mt-1" />
      <div>
        <div className="flex items-center gap-2 font-semibold">{icon}{title}</div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </label>
  );
}

function SummaryRow({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={"flex items-center justify-between text-sm " + (className ?? "")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}