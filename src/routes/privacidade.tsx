import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — PAGOU" },
      { name: "description", content: "Como a PAGOU coleta, usa e protege seus dados pessoais." },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <SiteShell>
      <PageHeader eyebrow="Documento legal" title="Política de privacidade" subtitle="Última atualização: julho de 2026." />
      <article className="mx-auto max-w-3xl space-y-6 px-4 py-12 text-sm leading-relaxed text-foreground/85">
        <p>
          A PAGOU coleta apenas os dados necessários para intermediar compras: nome, e-mail, CPF,
          telefone e histórico de pedidos. Os dados são armazenados em provedor com criptografia
          em repouso e em trânsito, e são utilizados exclusivamente para viabilizar a operação da
          plataforma e o cumprimento de obrigações legais.
        </p>
        <h2 className="font-display text-lg font-semibold">1. Base legal (LGPD)</h2>
        <p>
          Tratamos dados com base na execução do contrato de compra, cumprimento de obrigação
          legal e legítimo interesse na prevenção a fraudes.
        </p>
        <h2 className="font-display text-lg font-semibold">2. Compartilhamento</h2>
        <p>
          Dados de pagamento são compartilhados com o provedor autorizado (Mercado Pago) apenas
          para processar a transação. Não vendemos dados pessoais a terceiros.
        </p>
        <h2 className="font-display text-lg font-semibold">3. Seus direitos</h2>
        <p>
          Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados a
          qualquer momento pelo canal de suporte.
        </p>
        <h2 className="font-display text-lg font-semibold">4. Contato do encarregado</h2>
        <p>privacidade@pagou.app</p>
      </article>
    </SiteShell>
  );
}
