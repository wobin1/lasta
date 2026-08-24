"use server";

import { clearFlash } from "@/lib/flash";

export async function consumeFlash() {
  await clearFlash();
}
