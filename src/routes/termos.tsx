import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";
import { COMPANY } from "@/lib/company";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de uso — PAGOU" },
      { name: "description", content: "Termos e condições de uso da plataforma PAGOU." },
      { property: "og:title", content: "Termos de uso — PAGOU" },
      { property: "og:url", content: "https://pagou.lovable.app/termos" },
    ],
    links: [{ rel: "canonical", href: "https://pagou.lovable.app/termos" }],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <SiteShell>
      <PageHeader eyebrow="Documento legal" title="Termos de uso" subtitle="Última atualização: julho de 2026." />
      <article className="mx-auto max-w-3xl space-y-6 px-4 py-12 text-sm leading-relaxed text-foreground/85">
        <p>
          A plataforma PAGOU é operada por {COMPANY.legalName}, inscrita no CNPJ {COMPANY.cnpj}.
          Ao utilizar a PAGOU, você concorda com os termos descritos abaixo.
        </p>

        <h2 className="font-display text-lg font-semibold">1. Identificação da plataforma</h2>
        <p>
          A PAGOU é operada por {COMPANY.legalName}, CNPJ {COMPANY.cnpj}. Contato:{" "}
          <a className="text-primary hover:underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>{" "}
          — WhatsApp{" "}
          <a className="text-primary hover:underline" href={COMPANY.whatsappHref} target="_blank" rel="noreferrer">
            {COMPANY.whatsappDisplay}
          </a>.
        </p>

        <h2 className="font-display text-lg font-semibold">2. Funcionamento da PAGOU</h2>
        <p>
          A PAGOU é uma plataforma que intermedia a venda de ingressos, cursos e produtos digitais
          entre produtores e compradores. A PAGOU não é banco, instituição financeira nem fintech.
        </p>

        <h2 className="font-display text-lg font-semibold">3. Cadastro e conta do usuário</h2>
        <p>
          Para comprar ou vender é necessário criar conta com dados verdadeiros e atualizados. O
          usuário é responsável por manter a confidencialidade das suas credenciais de acesso.
        </p>

        <h2 className="font-display text-lg font-semibold">4. Compra e pagamento</h2>
        <p>
          Todos os valores exibidos são consultados e validados pelo servidor da PAGOU a partir do
          produto e do lote selecionados. Nenhum preço informado pelo navegador é considerado. A
          compra somente é liberada após confirmação do pagamento aprovado pelo provedor autorizado.
        </p>

        <h2 className="font-display text-lg font-semibold">5. Ingressos e QR Code</h2>
        <p>
          Ingressos são pessoais, identificados por QR Code individual e válidos para uso único.
          Sua transferência depende de autorização do produtor responsável pelo evento.
        </p>

        <h2 className="font-display text-lg font-semibold">6. Cursos e produtos digitais</h2>
        <p>
          O acesso a cursos e produtos digitais é liberado após a confirmação do pagamento e fica
          vinculado à conta do comprador.
        </p>

        <h2 className="font-display text-lg font-semibold">7. Responsabilidade dos produtores</h2>
        <p>
          O produtor é o responsável pela realização do evento, pela entrega do conteúdo ofertado,
          pela veracidade das informações publicadas e pelo cumprimento das obrigações legais e
          fiscais aplicáveis à sua atividade.
        </p>

        <h2 className="font-display text-lg font-semibold">8. Cancelamentos e reembolsos</h2>
        <p>
          Aplicam-se as regras do Código de Defesa do Consumidor. Solicitações devem ser
          direcionadas ao atendimento da PAGOU, que as encaminhará conforme a política do produtor
          e a legislação vigente.
        </p>

        <h2 className="font-display text-lg font-semibold">9. Eventos cancelados ou adiados</h2>
        <p>
          Em caso de cancelamento ou adiamento, o produtor é o responsável por comunicar os
          compradores e definir a política de reembolso ou remarcação, conforme a legislação.
        </p>

        <h2 className="font-display text-lg font-semibold">10. Uso indevido da plataforma</h2>
        <p>
          É vedado utilizar a PAGOU para revenda não autorizada de ingressos, fraude, lavagem de
          dinheiro ou qualquer prática ilícita. Contas envolvidas em uso indevido podem ser
          suspensas ou encerradas.
        </p>

        <h2 className="font-display text-lg font-semibold">11. Privacidade e proteção de dados</h2>
        <p>
          O tratamento de dados pessoais segue a{" "}
          <a className="text-primary hover:underline" href="/privacidade">Política de Privacidade</a>{" "}
          e a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>

        <h2 className="font-display text-lg font-semibold">12. Atendimento</h2>
        <p>
          E-mail:{" "}
          <a className="text-primary hover:underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
          . WhatsApp:{" "}
          <a className="text-primary hover:underline" href={COMPANY.whatsappHref} target="_blank" rel="noreferrer">
            {COMPANY.whatsappDisplay}
          </a>.
        </p>

        <h2 className="font-display text-lg font-semibold">13. Alterações dos termos</h2>
        <p>
          Estes termos podem ser atualizados a qualquer momento. A versão vigente é sempre a
          publicada nesta página, com a data de última atualização indicada acima.
        </p>

        <h2 className="font-display text-lg font-semibold">14. Legislação aplicável</h2>
        <p>
          Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
          do domicílio do consumidor para dirimir eventuais controvérsias.
        </p>
      </article>
    </SiteShell>
  );
}
