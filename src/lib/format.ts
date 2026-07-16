// Formatação determinística — mesmo resultado no SSR e no navegador,
// sempre no fuso America/Sao_Paulo (UTC-3, sem horário de verão desde 2019).

const MONTHS_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function toSaoPauloParts(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  // Deslocamento fixo de -3h para renderizar no horário de Brasília.
  const shifted = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return {
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth(),
    year: shifted.getUTCFullYear(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

export function formatBRL(cents: number | null | undefined): string {
  const value = (cents ?? 0) / 100;
  const [intPart, decPart = "00"] = value.toFixed(2).split(".");
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${intWithDots},${decPart}`;
}

export function formatDateBR(iso: string | Date): string {
  const p = toSaoPauloParts(iso);
  return `${pad2(p.day)} ${MONTHS_PT[p.month]} ${p.year}`;
}

export function formatDateTimeBR(iso: string | Date): string {
  const p = toSaoPauloParts(iso);
  return `${pad2(p.day)} ${MONTHS_PT[p.month]}, ${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function formatTimeBR(iso: string | Date): string {
  const p = toSaoPauloParts(iso);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}