const LAGOS = "Africa/Lagos";

export function formatLagosDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LAGOS,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatLagosDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: LAGOS,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function startOfTodayLagos(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${parts}T00:00:00+01:00`);
}

export function startOfMonthLagos(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return new Date(`${year}-${month}-01T00:00:00+01:00`);
}

export function dateInputFromDate(value: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LAGOS,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function addCalendarDaysLagos(value: Date, days: number): Date {
  const next = new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
  const stamp = dateInputFromDate(next);
  return new Date(`${stamp}T00:00:00+01:00`);
}

export function formatWait(from: Date, now = new Date()) {
  const mins = Math.max(0, Math.round((now.getTime() - from.getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function greetingLagos(name: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: LAGOS,
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
  const hello = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name.trim().split(" ")[0] || "there";
  return `${hello}, ${first}`;
}
