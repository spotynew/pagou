import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-4">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-xs text-sm text-ink-foreground/70">
            Comprou. Pagou. Aproveitou. A plataforma brasileira de ingressos e cursos.
          </p>
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
          <FooterLink to="/">Termos</FooterLink>
          <FooterLink to="/">Privacidade</FooterLink>
          <FooterLink to="/">Suporte</FooterLink>
        </FooterCol>
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-ink-foreground/60 md:flex-row">
          <span>© {new Date().getFullYear()} PAGOU Tecnologia Ltda.</span>
          <span>CNPJ 00.000.000/0001-00 — Todos os direitos reservados.</span>
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