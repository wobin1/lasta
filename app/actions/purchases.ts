"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { nextPublicId } from "@/lib/ids";
import { applyStockMove } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import type { FormState } from "./customers";

export type { FormState };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseQty(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 1000) / 1000;
}

function revalidatePurchases(id?: string) {
  revalidatePath("/inventory");
  revalidatePath("/inventory/purchases");
  revalidatePath("/inventory/shortages");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/inventory/purchases/${id}`);
}

export async function createPurchaseRequest(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("purchases.write");
  let rows: { inventoryItemId: string; qty: number }[] = [];
  try {
    rows = JSON.parse(str(formData, "lines") || "[]") as { inventoryItemId: string; qty: number }[];
  } catch {
    return { error: "The purchase lines could not be read." };
  }
  const lines = rows.filter((row) => row.inventoryItemId && row.qty > 0);
  if (lines.length === 0) return { error: "Add at least one material and quantity." };

  const publicId = await nextPublicId("PRQ");
  const request = await prisma.purchaseRequest.create({
    data: {
      publicId,
      notes: str(formData, "notes") || null,
      orderId: str(formData, "orderId") || null,
      createdById: user.id,
      lines: {
        create: lines.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          qty: new Prisma.Decimal(line.qty.toFixed(3)),
        })),
      },
    },
  });
  await writeAudit({
    actorId: user.id,
    entity: "PurchaseRequest",
    entityId: request.id,
    action: "create",
    after: { publicId, lines: lines.length },
  });
  revalidatePurchases(request.id);
  await flashSuccess("Purchase request created");
  redirect(`/inventory/purchases/${request.id}`);
}

export async function submitPurchaseRequest(id: string, _formData: FormData) {
  const user = await requirePermission("purchases.write");
  const request = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!request || request.status !== "DRAFT") return;
  await prisma.purchaseRequest.update({ where: { id }, data: { status: "SUBMITTED" } });
  await writeAudit({
    actorId: user.id,
    entity: "PurchaseRequest",
    entityId: id,
    action: "submit",
    before: { status: request.status },
    after: { status: "SUBMITTED" },
  });
  revalidatePurchases(id);
  await flashSuccess("Purchase request submitted");
}

export async function approvePurchaseRequest(id: string, _formData: FormData) {
  const user = await requirePermission("materials.override");
  const request = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!request || (request.status !== "SUBMITTED" && request.status !== "DRAFT")) return;
  await prisma.purchaseRequest.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id },
  });
  await writeAudit({
    actorId: user.id,
    entity: "PurchaseRequest",
    entityId: id,
    action: "approve",
    before: { status: request.status },
    after: { status: "APPROVED" },
  });
  revalidatePurchases(id);
  await flashSuccess("Purchase request approved");
}

export async function receivePurchaseRequest(id: string, _formData: FormData) {
  const user = await requirePermission("purchases.write");
  const request = await prisma.purchaseRequest.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!request || request.status !== "APPROVED") return;

  await prisma.$transaction(async (tx) => {
    for (const line of request.lines) {
      await applyStockMove(tx, {
        itemId: line.inventoryItemId,
        type: "PURCHASE",
        qty: Number(line.qty),
        orderId: request.orderId,
        reason: `Received ${request.publicId}`,
        createdById: user.id,
      });
    }
    await tx.purchaseRequest.update({ where: { id }, data: { status: "RECEIVED" } });
  });
  await writeAudit({
    actorId: user.id,
    entity: "PurchaseRequest",
    entityId: id,
    action: "receive",
    before: { status: request.status },
    after: { status: "RECEIVED" },
  });
  revalidatePurchases(id);
  await flashSuccess("Goods received into stock");
}

export async function cancelPurchaseRequest(id: string, _formData: FormData) {
  const user = await requirePermission("purchases.write");
  const request = await prisma.purchaseRequest.findUnique({ where: { id } });
  if (!request || request.status === "RECEIVED" || request.status === "CANCELLED") return;
  await prisma.purchaseRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  await writeAudit({
    actorId: user.id,
    entity: "PurchaseRequest",
    entityId: id,
    action: "cancel",
    before: { status: request.status },
    after: { status: "CANCELLED" },
  });
  revalidatePurchases(id);
  await flashSuccess("Purchase request cancelled");
}

export async function createPurchaseFromShortage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const itemId = str(formData, "inventoryItemId");
  const qty = parseQty(str(formData, "qty"));
  if (!itemId || qty === null) return { error: "Choose a material and quantity." };
  const payload = new FormData();
  payload.set("lines", JSON.stringify([{ inventoryItemId: itemId, qty }]));
  payload.set("notes", "Created from the shortage list.");
  payload.set("orderId", str(formData, "orderId"));
  return createPurchaseRequest({}, payload);
}
