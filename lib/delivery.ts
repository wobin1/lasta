import { DeliveryStatus, DeliveryType, OrderStatus, Prisma } from "@prisma/client";
import { notifyCustomerStatus } from "./email";
import { notify, notifyRole } from "./notifications";
import { prisma } from "./prisma";

type Tx = Prisma.TransactionClient;

export class DeliveryError extends Error {}

export function paidKobo(payments: { amountKobo: number }[]) {
  return payments.reduce((sum, row) => sum + row.amountKobo, 0);
}

export function orderBalance(order: { totalKobo: number; payments: { amountKobo: number }[] }) {
  return order.totalKobo - paidKobo(order.payments);
}

function assertCanLeaveShop(order: {
  status: OrderStatus;
  paymentOverride: boolean;
  totalKobo: number;
  payments: { amountKobo: number }[];
}) {
  if (order.status !== "READY_FOR_DELIVERY" && order.status !== "DISPATCHED") {
    throw new DeliveryError("This order is not ready to leave the shop.");
  }
  if (orderBalance(order) > 0 && !order.paymentOverride) {
    throw new DeliveryError("Balance is still outstanding. Owner or manager must override unpaid dispatch.");
  }
}

function orderStatusFor(delivery: { type: DeliveryType; status: DeliveryStatus }): OrderStatus | null {
  if (delivery.status === "FAILED") return null;
  if (delivery.status === "CONFIRMED") return "COMPLETED";
  if (delivery.status === "DELIVERED") return "DELIVERED";
  if (delivery.status === "PICKED_UP" || delivery.status === "IN_TRANSIT") return "DISPATCHED";
  if (delivery.type === "PICKUP" && delivery.status === "READY") return "READY_FOR_DELIVERY";
  return "READY_FOR_DELIVERY";
}

async function applyOrderStatus(orderId: string, delivery: { type: DeliveryType; status: DeliveryStatus }, tx: Tx) {
  const next = orderStatusFor(delivery);
  if (!next) return null;
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === next) return null;
  if (order.status === "CANCELLED" || order.status === "ON_HOLD") return null;
  await tx.order.update({ where: { id: orderId }, data: { status: next } });
  return next;
}

export async function createDelivery(input: {
  orderId: string;
  actorId: string;
  type: DeliveryType;
  phone: string;
  address?: string | null;
  feeKobo: number;
  notes?: string | null;
  riderUserId?: string | null;
}) {
  const phone = input.phone.trim();
  if (!phone) throw new DeliveryError("Phone is required.");
  if (input.type === "RIDER" && !input.address?.trim()) {
    throw new DeliveryError("Rider delivery needs an address.");
  }
  if (input.feeKobo < 0) throw new DeliveryError("Delivery fee cannot be negative.");

  let createdId = "";
  let customerNotice: OrderStatus | null = null;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { payments: true, customer: true, delivery: true },
    });
    if (!order) throw new DeliveryError("That order was not found.");
    if (order.delivery) throw new DeliveryError("This order already has a delivery.");
    if (order.status !== "READY_FOR_DELIVERY") {
      throw new DeliveryError("Dispatch starts when the order is ready for delivery.");
    }

    let riderUserId = input.riderUserId?.trim() || null;
    let status: DeliveryStatus = "READY";
    let assignedAt: Date | null = null;
    if (input.type === "RIDER" && riderUserId) {
      const rider = await tx.user.findUnique({ where: { id: riderUserId } });
      if (!rider?.active || rider.role !== "DELIVERY") {
        throw new DeliveryError("Choose an active delivery rider.");
      }
      status = "ASSIGNED";
      assignedAt = new Date();
    } else if (input.type === "PICKUP") {
      riderUserId = null;
    }

    const row = await tx.delivery.create({
      data: {
        orderId: order.id,
        type: input.type,
        status,
        phone,
        address: input.type === "RIDER" ? input.address?.trim() || order.customer.address : order.customer.address,
        feeKobo: input.feeKobo,
        notes: input.notes?.trim() || null,
        riderUserId,
        assignedAt,
        createdById: input.actorId,
      },
    });
    createdId = row.id;
    customerNotice = await applyOrderStatus(order.id, row, tx);
  });

  const delivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: createdId },
    include: { order: { include: { customer: true } }, rider: true },
  });
  if (delivery.riderUserId) {
    await notify({
      userId: delivery.riderUserId,
      body: `${delivery.order.publicId} · ${delivery.order.customer.fullName} is assigned to you.`,
      href: `/delivery/${delivery.id}`,
    });
  } else if (delivery.type === "RIDER") {
    await notifyRole(
      "DELIVERY",
      `${delivery.order.publicId} is ready for a rider.`,
      `/delivery/${delivery.id}`,
    );
  }
  if (customerNotice) await notifyCustomerStatus(delivery.orderId, customerNotice);
  return delivery;
}

export async function assignRider(deliveryId: string, riderUserId: string, actorId: string) {
  let customerNotice: OrderStatus | null = null;
  await prisma.$transaction(async (tx) => {
    const delivery = await loadDelivery(deliveryId, tx);
    if (delivery.type !== "RIDER") throw new DeliveryError("Pickup does not use a rider.");
    if (delivery.status === "DELIVERED" || delivery.status === "CONFIRMED") {
      throw new DeliveryError("This delivery is already complete.");
    }
    const rider = await tx.user.findUnique({ where: { id: riderUserId } });
    if (!rider?.active || rider.role !== "DELIVERY") {
      throw new DeliveryError("Choose an active delivery rider.");
    }
    const nextStatus: DeliveryStatus = delivery.status === "FAILED" || delivery.status === "READY" ? "ASSIGNED" : delivery.status;
    const updated = await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        riderUserId,
        status: nextStatus,
        assignedAt: delivery.assignedAt ?? new Date(),
        failReason: nextStatus === "ASSIGNED" ? null : delivery.failReason,
        failedAt: nextStatus === "ASSIGNED" ? null : delivery.failedAt,
      },
    });
    customerNotice = await applyOrderStatus(delivery.orderId, updated, tx);
  });
  const delivery = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    include: { order: { include: { customer: true } } },
  });
  if (riderUserId !== actorId) {
    await notify({
      userId: riderUserId,
      body: `${delivery.order.publicId} · ${delivery.order.customer.fullName} is assigned to you.`,
      href: `/delivery/${delivery.id}`,
    });
  }
  if (customerNotice) await notifyCustomerStatus(delivery.orderId, customerNotice);
}

export async function markPickedUp(deliveryId: string, actorId: string) {
  await advance(deliveryId, actorId, "PICKED_UP");
}

export async function markInTransit(deliveryId: string, actorId: string) {
  await advance(deliveryId, actorId, "IN_TRANSIT");
}

export async function markDelivered(deliveryId: string, actorId: string) {
  await advance(deliveryId, actorId, "DELIVERED");
}

export async function confirmDelivery(deliveryId: string, actorId: string) {
  await advance(deliveryId, actorId, "CONFIRMED");
}

export async function collectPickup(deliveryId: string, actorId: string) {
  await advance(deliveryId, actorId, "CONFIRMED");
}

export async function failDelivery(deliveryId: string, actorId: string, reason: string) {
  const failReason = reason.trim();
  if (!failReason) throw new DeliveryError("Write why the delivery failed.");
  await prisma.$transaction(async (tx) => {
    const delivery = await loadDelivery(deliveryId, tx);
    if (delivery.status === "CONFIRMED") throw new DeliveryError("A confirmed delivery cannot fail.");
    await tx.delivery.update({
      where: { id: deliveryId },
      data: { status: "FAILED", failReason, failedAt: new Date() },
    });
  });
}

async function advance(deliveryId: string, actorId: string, target: DeliveryStatus) {
  let customerNotice: OrderStatus | null = null;
  let orderId = "";
  await prisma.$transaction(async (tx) => {
    const delivery = await loadDelivery(deliveryId, tx);
    orderId = delivery.orderId;
    assertTransition(delivery, target);
    if (target === "PICKED_UP" || (delivery.type === "PICKUP" && target === "CONFIRMED")) {
      assertCanLeaveShop(delivery.order);
    }
    const now = new Date();
    const data: Prisma.DeliveryUpdateInput = { status: target };
    if (target === "PICKED_UP") data.pickedUpAt = now;
    if (target === "IN_TRANSIT") data.inTransitAt = now;
    if (target === "DELIVERED") data.deliveredAt = now;
    if (target === "CONFIRMED") {
      data.confirmedAt = now;
      if (!delivery.deliveredAt) data.deliveredAt = now;
      if (delivery.type === "PICKUP" && !delivery.pickedUpAt) data.pickedUpAt = now;
    }
    const updated = await tx.delivery.update({ where: { id: deliveryId }, data });
    customerNotice = await applyOrderStatus(delivery.orderId, updated, tx);
  });
  if (customerNotice) await notifyCustomerStatus(orderId, customerNotice);
}

function assertTransition(delivery: { type: DeliveryType; status: DeliveryStatus }, target: DeliveryStatus) {
  const allowed = allowedNext(delivery.type, delivery.status);
  if (!allowed.includes(target)) {
    throw new DeliveryError("That step is not next for this delivery.");
  }
}

export function allowedNext(type: DeliveryType, status: DeliveryStatus): DeliveryStatus[] {
  if (type === "PICKUP") {
    if (status === "READY" || status === "FAILED") return ["CONFIRMED"];
    return [];
  }
  if (status === "READY" || status === "FAILED") return ["ASSIGNED"];
  if (status === "ASSIGNED") return ["PICKED_UP"];
  if (status === "PICKED_UP") return ["IN_TRANSIT", "DELIVERED"];
  if (status === "IN_TRANSIT") return ["DELIVERED"];
  if (status === "DELIVERED") return ["CONFIRMED"];
  return [];
}

async function loadDelivery(id: string, client: Tx | typeof prisma = prisma) {
  const delivery = await client.delivery.findUnique({
    where: { id },
    include: {
      order: { include: { payments: true, customer: true } },
      rider: true,
    },
  });
  if (!delivery) throw new DeliveryError("That delivery was not found.");
  return delivery;
}

export async function listRiders() {
  return prisma.user.findMany({
    where: { active: true, role: "DELIVERY" },
    orderBy: { name: "asc" },
  });
}
