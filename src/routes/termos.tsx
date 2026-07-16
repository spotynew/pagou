import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso — PAGOU" },
      { name: "description", content: "Termos e condições de uso da plataforma PAGOU." },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <SiteShell>
      <PageHeader eyebrow="Documento legal" title="Termos de uso" subtitle="Última atualização: julho de 2026." />
      <article className="mx-auto max-w-3xl space-y-6 px-4 py-12 text-sm leading-relaxed text-foreground/85">
        <p>
          A PAGOU é uma plataforma em fase de lançamento que intermedia a venda de ingressos,
          cursos e produtos digitais entre produtores e compradores. Ao utilizar a plataforma,
          você concorda com as regras descritas abaixo.
        </p>
        <h2 className="font-display text-lg font-semibold">1. Compra e pagamento</h2>
        <p>
          Os valores exibidos são calculados pelo servidor da PAGOU a partir do produto e do lote
          selecionado. A confirmação da compra ocorre apenas após aprovação do pagamento pelo
          provedor autorizado. Nenhuma credencial de pagamento é armazenada no navegador.
        </p>
        <h2 className="font-display text-lg font-semibold">2. Ingressos e cursos</h2>
        <p>
          Ingressos são pessoais, intransferíveis salvo indicação em contrário do produtor, e só
          podem ser utilizados uma única vez. O acesso a cursos é liberado após confirmação do
          pagamento e vinculado à conta do comprador.
        </p>
        <h2 className="font-display text-lg font-semibold">3. Reembolsos</h2>
        <p>
          Aplicam-se as regras do Código de Defesa do Consumidor. Pedidos de reembolso devem ser
          direcionados ao suporte da PAGOU em até 7 dias corridos.
        </p>
        <h2 className="font-display text-lg font-semibold">4. Contato</h2>
        <p>
          Dúvidas ou solicitações: suporte@pagou.app.
        </p>
      </article>
    </SiteShell>
  );
}
