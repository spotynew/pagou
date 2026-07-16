import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useQuery } from "@tanstack/react-query";
import { appSettingsQuery, hasAnyContact, CONTACTS_PENDING_MESSAGE } from "@/lib/app-settings";

export function Footer() {
  const { data: settings } = useQuery(appSettingsQuery());
  const hasContacts = hasAnyContact(settings);

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
            {hasContacts ? (
              <ul className="space-y-1">
                {settings?.support_email && (
                  <li>Suporte: <a className="hover:text-primary" href={`mailto:${settings.support_email}`}>{settings.support_email}</a></li>
                )}
                {settings?.privacy_email && (
                  <li>Privacidade: <a className="hover:text-primary" href={`mailto:${settings.privacy_email}`}>{settings.privacy_email}</a></li>
                )}
                {settings?.whatsapp_support && (
                  <li>WhatsApp: {settings.whatsapp_support}</li>
                )}
              </ul>
            ) : (
              <p>{CONTACTS_PENDING_MESSAGE}</p>
            )}
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
          <span>© 2026 PAGOU · plataforma em fase de lançamento</span>
          <span>Todos os direitos reservados.</span>
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