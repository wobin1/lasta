export const PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export type PageWindow = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
};

export function parsePageSize(raw?: string | string[]) {
  const parsed = Number.parseInt(firstParam(raw) || "", 10);
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed) ? parsed : PAGE_SIZE;
}

export function sizeParam(size: number) {
  return size === PAGE_SIZE ? undefined : String(size);
}

export function paginate(total: number, rawPage?: string, pageSize = PAGE_SIZE): PageWindow {
  const size = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / size));
  const parsed = Number.parseInt(rawPage ?? "1", 10);
  const page = Number.isFinite(parsed) ? Math.min(totalPages, Math.max(1, parsed)) : 1;
  const skip = (page - 1) * size;
  const from = total === 0 ? 0 : skip + 1;
  const to = Math.min(total, skip + size);
  return { page, pageSize: size, skip, take: size, total, totalPages, from, to };
}

export function firstParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

export function containsInsensitive(value: string) {
  return { contains: value, mode: "insensitive" as const };
}

export function pageHref(
  path: string,
  current: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (!value || key === "page") continue;
    params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
