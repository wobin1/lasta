"use server";

import { DeliveryType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import {
  DeliveryError,
  assignRider,
  collectPickup,
  confirmDelivery,
  createDelivery,
  failDelivery,
  markDelivered,
  markInTransit,
  markPickedUp,
} from "@/lib/delivery";
import { flashSuccess } from "@/lib/flash";
import { parseNairaToKobo } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { actionUser } from "@/lib/session";
import type { FormState } from "./customers";

export type { FormState };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateDelivery(orderId?: string, deliveryId?: string) {
  revalidatePath("/delivery");
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  revalidatePath("/reports");
  if (orderId) revalidatePath(`/orders/${orderId}`);
  if (deliveryId) revalidatePath(`/delivery/${deliveryId}`);
}

function asFormError(error: unknown): FormState {
  if (error instanceof DeliveryError) return { error: error.message };
  if (error instanceof Error && error.message) return { error: error.message };
  return { error: "Could not update that delivery. Try again." };
}

export async function createDeliveryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const authz = await actionUser("delivery.write");
  if ("error" in authz) return authz;
  const orderId = str(formData, "orderId");
  const type = str(formData, "type") as DeliveryType;
  if (type !== "PICKUP" && type !== "RIDER") return { error: "Choose pickup or rider." };
  const fee = parseNairaToKobo(str(formData, "feeNaira") || "0");
  if (fee === null) return { error: "Delivery fee must be a number." };
  let deliveryId = "";
  try {
    const delivery = await createDelivery({
      orderId,
      actorId: authz.user.id,
      type,
      phone: str(formData, "phone"),
      address: str(formData, "address") || null,
      feeKobo: fee,
      notes: str(formData, "notes") || null,
      riderUserId: str(formData, "riderUserId") || null,
    });
    deliveryId = delivery.id;
    await writeAudit({
      actorId: authz.user.id,
      entity: "Delivery",
      entityId: delivery.id,
      action: "create",
      after: { orderId, type, riderUserId: delivery.riderUserId },
    });
  } catch (error) {
    return asFormError(error);
  }
  revalidateDelivery(orderId, deliveryId);
  await flashSuccess(type === "PICKUP" ? "Pickup recorded" : "Rider delivery created");
  redirect(`/delivery/${deliveryId}`);
}

export async function assignRiderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const authz = await actionUser("delivery.write");
  if ("error" in authz) return authz;
  const deliveryId = str(formData, "deliveryId");
  const riderUserId = str(formData, "riderUserId");
  if (!riderUserId) return { error: "Choose a rider." };
  try {
    await assignRider(deliveryId, riderUserId, authz.user.id);
  } catch (error) {
    return asFormError(error);
  }
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  await writeAudit({
    actorId: authz.user.id,
    entity: "Delivery",
    entityId: deliveryId,
    action: "assign",
    after: { riderUserId },
  });
  revalidateDelivery(delivery?.orderId, deliveryId);
  await flashSuccess("Rider assigned");
  return {};
}

async function runStep(
  deliveryId: string,
  permission: "delivery.write",
  action: string,
  run: (actorId: string) => Promise<void>,
  message: string,
): Promise<FormState> {
  const authz = await actionUser(permission);
  if ("error" in authz) return authz;
  try {
    await run(authz.user.id);
  } catch (error) {
    return asFormError(error);
  }
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  await writeAudit({
    actorId: authz.user.id,
    entity: "Delivery",
    entityId: deliveryId,
    action,
  });
  revalidateDelivery(delivery?.orderId, deliveryId);
  await flashSuccess(message);
  return {};
}

export async function collectPickupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const deliveryId = str(formData, "deliveryId");
  return runStep(deliveryId, "delivery.write", "collect", (actorId) => collectPickup(deliveryId, actorId), "Customer collected — order complete");
}

export async function pickUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const deliveryId = str(formData, "deliveryId");
  return runStep(deliveryId, "delivery.write", "pickup", (actorId) => markPickedUp(deliveryId, actorId), "Marked picked up");
}

export async function inTransitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const deliveryId = str(formData, "deliveryId");
  return runStep(deliveryId, "delivery.write", "in-transit", (actorId) => markInTransit(deliveryId, actorId), "Marked in transit");
}

export async function deliveredAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const deliveryId = str(formData, "deliveryId");
  return runStep(deliveryId, "delivery.write", "delivered", (actorId) => markDelivered(deliveryId, actorId), "Marked delivered");
}

export async function confirmDeliveryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const deliveryId = str(formData, "deliveryId");
  return runStep(deliveryId, "delivery.write", "confirm", (actorId) => confirmDelivery(deliveryId, actorId), "Delivery confirmed");
}

export async function failDeliveryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const authz = await actionUser("delivery.write");
  if ("error" in authz) return authz;
  const deliveryId = str(formData, "deliveryId");
  try {
    await failDelivery(deliveryId, authz.user.id, str(formData, "failReason"));
  } catch (error) {
    return asFormError(error);
  }
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
  await writeAudit({
    actorId: authz.user.id,
    entity: "Delivery",
    entityId: deliveryId,
    action: "fail",
    after: { reason: str(formData, "failReason") },
  });
  revalidateDelivery(delivery?.orderId, deliveryId);
  await flashSuccess("Delivery marked failed");
  return {};
}

export async function overrideUnpaidDispatch(
  orderId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const authz = await actionUser("payments.override");
  if ("error" in authz) return authz;
  const reason = str(formData, "reason");
  if (!reason) return { error: "Write why this unpaid order may leave the shop." };
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order was not found." };
  if (order.status !== "READY_FOR_DELIVERY" && order.status !== "DISPATCHED") {
    return { error: "Override unpaid dispatch when the order is ready to leave." };
  }
  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentOverride: true,
      paymentOverrideAt: new Date(),
      paymentOverrideById: authz.user.id,
      paymentOverrideReason: reason,
    },
  });
  await writeAudit({
    actorId: authz.user.id,
    entity: "Order",
    entityId: orderId,
    action: "payment-override",
    after: { reason },
  });
  revalidateDelivery(orderId);
  await flashSuccess("Unpaid dispatch allowed");
  return {};
}
