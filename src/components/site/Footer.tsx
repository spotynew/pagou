import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { COMPANY } from "@/lib/company";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm text-ink-foreground/70">
            Comprou. Pagou. Aproveitou. A plataforma brasileira de ingressos e cursos.
          </p>
          <div className="mt-6 text-xs text-ink-foreground/60">
            <h4 className="mb-2 font-semibold uppercase tracking-widest">Fale conosco</h4>
            <ul className="space-y-1">
              <li>
                E-mail:{" "}
                <a className="hover:text-primary" href={`mailto:${COMPANY.email}`}>
                  {COMPANY.email}
                </a>
              </li>
              <li>
                WhatsApp:{" "}
                <a
                  className="hover:text-primary"
                  href={COMPANY.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                >
                  {COMPANY.whatsappDisplay}
                </a>
              </li>
            </ul>
            <p className="mt-4 leading-relaxed">
              {COMPANY.legalName}
              <br />
              CNPJ {COMPANY.cnpj}
            </p>
          </div>
        </div>
        <FooterCol title="Plataforma">
          <FooterLink to="/eventos">Eventos</FooterLink>
          <FooterLink to="/cursos">Cursos</FooterLink>
          <FooterLink to="/vender">Venda com a PAGOU</FooterLink>
        </FooterCol>
        <FooterCol title="Conta">
          <FooterLink to="/minhas-compras">Minhas compras</FooterLink>
          <FooterLink to="/auth">Entrar</FooterLink>
          <FooterLink to="/checkin">Check-in</FooterLink>
        </FooterCol>
        <FooterCol title="Institucional">
          <FooterLink to="/termos">Termos de uso</FooterLink>
          <FooterLink to="/privacidade">Privacidade</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-ink-foreground/60 md:flex-row">
          <span>© 2026 PAGOU. Todos os direitos reservados.</span>
          <span>
            {COMPANY.legalName} · CNPJ {COMPANY.cnpj}
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-foreground/60">{title}</h4>
      <ul className="flex flex-col gap-2 text-sm">{children}</ul>
    </div>
  );
}
function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-ink-foreground/80 transition-colors hover:text-primary">
        {children}
      </Link>
    </li>
  );
}