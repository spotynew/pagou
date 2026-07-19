import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHeader } from "@/components/site/PageHeader";
import { COMPANY } from "@/lib/company";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de privacidade — PAGOU" },
      { name: "description", content: "Como a PAGOU coleta, usa e protege seus dados pessoais." },
      { property: "og:title", content: "Política de privacidade — PAGOU" },
      { property: "og:url", content: "https://pagou.lovable.app/privacidade" },
    ],
    links: [{ rel: "canonical", href: "https://pagou.lovable.app/privacidade" }],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <SiteShell>
      <PageHeader eyebrow="Documento legal" title="Política de privacidade" subtitle="Última atualização: julho de 2026." />
      <article className="mx-auto max-w-3xl space-y-6 px-4 py-12 text-sm leading-relaxed text-foreground/85">
        <h2 className="font-display text-lg font-semibold">1. Identificação do controlador</h2>
        <p>
          O controlador dos dados pessoais tratados pela plataforma PAGOU é {COMPANY.legalName},
          CNPJ {COMPANY.cnpj}.
        </p>

        <h2 className="font-display text-lg font-semibold">2. Dados pessoais coletados</h2>
        <p>
          Coletamos os dados fornecidos pelo usuário no cadastro e na compra (como nome, e-mail,
          CPF e telefone), dados sobre pedidos e ingressos, e informações técnicas de acesso
          (como endereço IP e identificadores do dispositivo).
        </p>

        <h2 className="font-display text-lg font-semibold">3. Finalidades do tratamento</h2>
        <p>
          Os dados são utilizados para viabilizar cadastros, compras e emissão de ingressos,
          prestar atendimento, cumprir obrigações legais e regulatórias e prevenir fraudes.
        </p>

        <h2 className="font-display text-lg font-semibold">4. Bases legais</h2>
        <p>
          Tratamos dados pessoais com base na execução de contrato, no cumprimento de obrigação
          legal, no consentimento (quando aplicável) e no legítimo interesse, sempre nos termos
          da Lei Geral de Proteção de Dados (LGPD).
        </p>

        <h2 className="font-display text-lg font-semibold">5. Compartilhamento com prestadores</h2>
        <p>
          Compartilhamos dados apenas com prestadores necessários à operação da plataforma, como
          serviços de hospedagem, autenticação e provedores de pagamento, e sempre para as
          finalidades descritas nesta política.
        </p>

        <h2 className="font-display text-lg font-semibold">6. Mercado Pago</h2>
        <p>
          Os dados necessários para processar pagamentos são compartilhados com o Mercado Pago,
          responsável pelo processamento das transações. Recomendamos a leitura da política de
          privacidade do Mercado Pago.
        </p>

        <h2 className="font-display text-lg font-semibold">7. Armazenamento e segurança</h2>
        <p>
          Adotamos medidas técnicas e administrativas para proteger os dados pessoais contra
          acessos não autorizados, perdas e alterações indevidas, de acordo com as melhores
          práticas aplicáveis à nossa operação.
        </p>

        <h2 className="font-display text-lg font-semibold">8. Cookies e tecnologias de rastreamento</h2>
        <p>
          Utilizamos cookies e tecnologias similares para manter a sessão do usuário, medir uso da
          plataforma e melhorar a experiência de navegação.
        </p>

        <h2 className="font-display text-lg font-semibold">9. Direitos do titular</h2>
        <p>
          O titular pode solicitar confirmação da existência de tratamento, acesso, correção,
          anonimização, portabilidade, informação sobre compartilhamento e revogação do
          consentimento, nos termos da LGPD.
        </p>

        <h2 className="font-display text-lg font-semibold">10. Prazo de retenção</h2>
        <p>
          Os dados são mantidos pelo período necessário ao cumprimento das finalidades descritas e
          das obrigações legais e regulatórias aplicáveis.
        </p>

        <h2 className="font-display text-lg font-semibold">11. Exclusão da conta</h2>
        <p>
          O titular pode solicitar a exclusão da conta a qualquer momento. Dados necessários ao
          cumprimento de obrigações legais poderão ser retidos pelo período exigido em lei.
        </p>

        <h2 className="font-display text-lg font-semibold">12. Canal de atendimento</h2>
        <p>
          Para assuntos relacionados à privacidade, entre em contato pelo e-mail{" "}
          <a className="text-primary hover:underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
        </p>

        <h2 className="font-display text-lg font-semibold">13. Atualizações da política</h2>
        <p>
          Esta política pode ser atualizada. A versão vigente é sempre a publicada nesta página,
          com a data de última atualização indicada acima.
        </p>
      </article>
    </SiteShell>
  );
}
