"use server";

import { OrderStatus, PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { notifyCustomerStatus } from "@/lib/email";
import { flashSuccess } from "@/lib/flash";
import { nextPublicId } from "@/lib/ids";
import { releaseOrderReserves, reserveOrderMaterials } from "@/lib/inventory";
import { deskStatuses, orderStatusLabel } from "@/lib/labels";
import { formatNgnFromKobo, parseNairaToKobo } from "@/lib/money";
import { ensureProductionJobs, holdOpenTasks } from "@/lib/production";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import type { FormState } from "./customers";

export type { FormState };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

type ItemInput = {
  id?: string;
  productId: string;
  size: string;
  quantity: number;
  measurementId?: string | null;
  notes?: string;
};

async function parseItems(
  formData: FormData,
  existing?: { id: string; productId: string; unitPriceKobo: number }[],
) {
  let items: ItemInput[] = [];
  try {
    items = JSON.parse(str(formData, "items") || "[]") as ItemInput[];
  } catch {
    return { error: "The order items could not be read. Add the lines again." as const };
  }
  if (items.length === 0) {
    return { error: "Add at least one product line." as const };
  }

  const productIds = [...new Set(items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  const existingById = new Map((existing ?? []).map((line) => [line.id, line]));
  const allowedArchived = new Set((existing ?? []).map((line) => line.productId));

  const lines = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) return { error: "One of the products is missing." as const };
    if (product.status !== "ACTIVE" && !allowedArchived.has(product.id)) {
      return { error: "One of the products is archived. Choose an active product." as const };
    }
    if (!item.size) return { error: "Every line needs a size." as const };
    if (!item.quantity || item.quantity < 1) {
      return { error: "Quantity must be at least 1." as const };
    }
    const previous = item.id ? existingById.get(item.id) : undefined;
    const unitPriceKobo =
      previous && previous.productId === item.productId
        ? previous.unitPriceKobo
        : product.priceKobo;
    lines.push({
      productId: product.id,
      size: item.size,
      quantity: item.quantity,
      measurementId: item.measurementId || null,
      unitPriceKobo,
      notes: item.notes || null,
    });
  }

  return { lines };
}

export async function createOrder(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("orders.write");
  const customerId = str(formData, "customerId");
  const requiredDate = str(formData, "requiredDate");
  if (!customerId) return { error: "Select a customer." };
  if (!requiredDate) return { error: "Set the required delivery date." };

  const parsed = await parseItems(formData);
  if ("error" in parsed) return { error: parsed.error };
  const { lines } = parsed;

  const totalKobo = lines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0);
  const publicId = await nextPublicId("ORD");

  const order = await prisma.order.create({
    data: {
      publicId,
      customerId,
      source: (str(formData, "source") as never) || "WALK_IN",
      requiredDate: new Date(`${requiredDate}T00:00:00+01:00`),
      notes: str(formData, "notes") || null,
      assignedSalesId: user.id,
      totalKobo,
      items: { create: lines },
    },
  });

  await writeAudit({
    actorId: user.id,
    entity: "Order",
    entityId: order.id,
    action: "create",
    after: { publicId, customerId, totalKobo, lines: lines.length },
  });
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  await flashSuccess("Order created");
  redirect(`/orders/${order.id}`);
}

export async function updateOrder(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("orders.write");
  const customerId = str(formData, "customerId");
  const requiredDate = str(formData, "requiredDate");
  if (!customerId) return { error: "Select a customer." };
  if (!requiredDate) return { error: "Set the required delivery date." };

  const before = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { productionJob: true } }, payments: true },
  });
  if (!before) return { error: "Order was not found." };
  if (before.items.some((item) => item.productionJob)) {
    return { error: "Production tasks already exist for this order. Do not change the lines." };
  }

  const parsed = await parseItems(formData, before.items);
  if ("error" in parsed) return { error: parsed.error };
  const { lines } = parsed;

  const totalKobo = lines.reduce((sum, line) => sum + line.unitPriceKobo * line.quantity, 0);
  const paid = before.payments.reduce((sum, p) => sum + p.amountKobo, 0);
  if (totalKobo < paid) {
    return {
      error: `The new total would be below what is already paid (${formatNgnFromKobo(paid)}). Add lines or raise quantity so the total covers payments.`,
    };
  }

  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { orderId } }),
    prisma.order.update({
      where: { id: orderId },
      data: {
        customerId,
        source: (str(formData, "source") as never) || before.source,
        requiredDate: new Date(`${requiredDate}T00:00:00+01:00`),
        notes: str(formData, "notes") || null,
        totalKobo,
        items: { create: lines },
      },
    }),
  ]);

  if (before.status !== "DRAFT" && before.status !== "CANCELLED") {
    const result = await reserveOrderMaterials(orderId, user.id, "strict");
    if (result.short) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "AWAITING_MATERIALS",
          materialsOverride: false,
          materialsOverrideAt: null,
          materialsOverrideById: null,
          materialsOverrideReason: null,
        },
      });
    }
  }

  await writeAudit({
    actorId: user.id,
    entity: "Order",
    entityId: orderId,
    action: "update",
    before: {
      customerId: before.customerId,
      totalKobo: before.totalKobo,
      lines: before.items.length,
    },
    after: { customerId, totalKobo, lines: lines.length },
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/inventory/shortages");
  await flashSuccess("Order saved");
  redirect(`/orders/${orderId}`);
}

export async function updateOrderStatus(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("orders.write");
  const requested = str(formData, "status") as OrderStatus;
  const before = await prisma.order.findUnique({ where: { id: orderId } });
  if (!before) return { error: "Order was not found." };
  if (!deskStatuses.includes(requested) && requested !== before.status) {
    return { error: "Production status is set from the shop floor, not this list." };
  }

  let next = requested;
  try {
    if (requested === "DRAFT" || requested === "CANCELLED") {
      await prisma.$transaction(async (tx) => {
        await releaseOrderReserves(orderId, user.id, tx);
        if (requested === "CANCELLED") await holdOpenTasks(orderId, tx);
      });
    }

    if (requested === "CONFIRMED") {
      const result = await reserveOrderMaterials(orderId, user.id, "strict");
      next = result.short ? "AWAITING_MATERIALS" : "READY_FOR_PRODUCTION";
      if (!result.short) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            materialsOverride: false,
            materialsOverrideAt: null,
            materialsOverrideById: null,
            materialsOverrideReason: null,
          },
        });
      }
    }
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: next },
  });
  if (next === "READY_FOR_PRODUCTION") {
    await ensureProductionJobs(orderId);
  }
  await writeAudit({
    actorId: user.id,
    entity: "Order",
    entityId: orderId,
    action: "status",
    before: { status: before.status },
    after: { status: next },
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/inventory/shortages");
  revalidatePath("/production");
  revalidatePath("/production/me");
  revalidatePath("/finishing");
  await flashSuccess(`Status updated to ${orderStatusLabel[next]}`);
  await notifyCustomerStatus(orderId, next);
  return {};
}

export async function retryOrderMaterials(orderId: string, _formData: FormData) {
  const user = await requirePermission("orders.write");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const result = await reserveOrderMaterials(orderId, user.id, "strict");
  if (result.short) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "AWAITING_MATERIALS" },
    });
    await flashSuccess("Stock is still short — the order stays awaiting materials");
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "READY_FOR_PRODUCTION",
        materialsOverride: false,
        materialsOverrideAt: null,
        materialsOverrideById: null,
        materialsOverrideReason: null,
      },
    });
    await ensureProductionJobs(orderId);
    await writeAudit({
      actorId: user.id,
      entity: "Order",
      entityId: orderId,
      action: "materials-ready",
      before: { status: order.status },
      after: { status: "READY_FOR_PRODUCTION" },
    });
    await flashSuccess("Materials reserved. Order is ready for production");
    await notifyCustomerStatus(orderId, "READY_FOR_PRODUCTION");
  }
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/shortages");
  revalidatePath("/dashboard");
  revalidatePath("/production");
  revalidatePath("/production/me");
}

export async function overrideOrderMaterials(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("materials.override");
  const reason = str(formData, "reason");
  if (!reason) return { error: "Write why production may start without full materials." };
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order was not found." };

  await reserveOrderMaterials(orderId, user.id, "available");
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "READY_FOR_PRODUCTION",
      materialsOverride: true,
      materialsOverrideAt: new Date(),
      materialsOverrideById: user.id,
      materialsOverrideReason: reason,
    },
  });
  await writeAudit({
    actorId: user.id,
    entity: "Order",
    entityId: orderId,
    action: "materials-override",
    before: { status: order.status, materialsOverride: order.materialsOverride },
    after: { status: "READY_FOR_PRODUCTION", reason },
  });
  await ensureProductionJobs(orderId);
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/shortages");
  revalidatePath("/dashboard");
  revalidatePath("/production");
  revalidatePath("/production/me");
  revalidatePath("/finishing");
  await flashSuccess("Production allowed without full materials");
  return {};
}

export async function deleteOrder(id: string, _formData: FormData) {
  const user = await requirePermission("orders.delete");
  const order = await prisma.order.findUnique({
    where: { id },
    include: { _count: { select: { payments: true } } },
  });
  if (!order) return;
  if (order._count.payments > 0) return;
  if (order.status !== "DRAFT" && order.status !== "CANCELLED") return;

  await prisma.$transaction(async (tx) => {
    await releaseOrderReserves(id, user.id, tx);
    await tx.order.delete({ where: { id } });
  });
  await writeAudit({
    actorId: user.id,
    entity: "Order",
    entityId: id,
    action: "delete",
    before: { publicId: order.publicId, status: order.status, totalKobo: order.totalKobo },
  });
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  await flashSuccess("Order deleted");
  redirect("/orders");
}

export async function recordPayment(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("payments.write");
  const amountKobo = parseNairaToKobo(str(formData, "amountNaira"));
  const method = str(formData, "method") as PaymentMethod;
  if (amountKobo === null || amountKobo < 1) {
    return { error: "Enter a payment amount greater than zero." };
  }
  if (!["CASH", "TRANSFER", "POS"].includes(method)) {
    return { error: "Choose cash, transfer, or POS." };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  if (!order) return { error: "Order was not found." };

  const paid = order.payments.reduce((sum, p) => sum + p.amountKobo, 0);
  if (paid + amountKobo > order.totalKobo) {
    return { error: "This payment would exceed the order total." };
  }

  const payment = await prisma.payment.create({
    data: {
      orderId,
      amountKobo,
      method,
      reference: str(formData, "reference") || null,
      recordedById: user.id,
    },
  });
  await writeAudit({
    actorId: user.id,
    entity: "Payment",
    entityId: payment.id,
    action: "create",
    after: { orderId, amountKobo, method },
  });
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/dashboard");
  await flashSuccess("Payment recorded");
  return {};
}
