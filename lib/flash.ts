import { cookies } from "next/headers";
import { FLASH_COOKIE, type FlashToast } from "./flash-types";

export type { FlashToast };

export async function flashSuccess(message: string) {
  const jar = await cookies();
  const payload: FlashToast = { id: crypto.randomUUID(), message };
  jar.set(FLASH_COOKIE, encodeURIComponent(JSON.stringify(payload)), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
  });
}

export async function readFlash(): Promise<FlashToast | null> {
  const jar = await cookies();
  const raw = jar.get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as FlashToast;
    if (!parsed?.id || !parsed?.message) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearFlash() {
  const jar = await cookies();
  jar.delete(FLASH_COOKIE);
}
