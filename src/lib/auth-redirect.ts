export function safeAuthRedirect(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  const pathname = value.split(/[?#]/, 1)[0];
  if (pathname === "/auth" || pathname.startsWith("/auth/")) return null;
  if (/[?&]redirect=/i.test(value)) return null;
  return value;
}
