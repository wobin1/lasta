import { OrderStatus } from "@prisma/client";
import { orderStatusLabel } from "./labels";
import { prisma } from "./prisma";

const CUSTOMER_STATUSES = new Set<OrderStatus>([
  "CONFIRMED",
  "READY_FOR_PRODUCTION",
  "READY_FOR_DELIVERY",
  "DISPATCHED",
  "DELIVERED",
  "COMPLETED",
]);

function subjectFor(status: OrderStatus, publicId: string) {
  if (status === "READY_FOR_DELIVERY") return `${publicId} is ready`;
  if (status === "DISPATCHED") return `${publicId} is on the way`;
  if (status === "DELIVERED" || status === "COMPLETED") return `${publicId} is complete`;
  return `Update on ${publicId}`;
}

function bodyFor(status: OrderStatus, publicId: string, name: string) {
  const greeting = `Hello ${name},`;
  if (status === "CONFIRMED" || status === "READY_FOR_PRODUCTION") {
    return `${greeting}\n\nWe have confirmed order ${publicId}. We will write again when it is ready.\n\nAtelier`;
  }
  if (status === "READY_FOR_DELIVERY") {
    return `${greeting}\n\nOrder ${publicId} is ready for collection or delivery.\n\nAtelier`;
  }
  if (status === "DISPATCHED") {
    return `${greeting}\n\nOrder ${publicId} has left the workshop and is on the way.\n\nAtelier`;
  }
  if (status === "DELIVERED" || status === "COMPLETED") {
    return `${greeting}\n\nOrder ${publicId} is complete. Thank you.\n\nAtelier`;
  }
  return `${greeting}\n\nOrder ${publicId} is now ${orderStatusLabel[status]}.\n\nAtelier`;
}

export async function notifyCustomerStatus(orderId: string, status: OrderStatus) {
  if (!CUSTOMER_STATUSES.has(status)) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });
  if (!order?.customer.email) return;
  const to = order.customer.email.trim();
  if (!to.includes("@")) return;
  const subject = subjectFor(status, order.publicId);
  const text = bodyFor(status, order.publicId, order.customer.fullName.split(" ")[0] || "there");
  try {
    await sendMail({ to, subject, text });
  } catch (error) {
    console.error("[email] customer status failed", order.publicId, error);
  }
}

async function sendMail(input: { to: string; subject: string; text: string }) {
  const webhook = process.env.EMAIL_WEBHOOK_URL?.trim();
  const from = process.env.SMTP_FROM?.trim() || process.env.EMAIL_FROM?.trim() || "Atelier";
  if (!webhook) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email skipped] to=${input.to} subject=${input.subject}`);
    }
    return;
  }
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.EMAIL_WEBHOOK_TOKEN) {
    headers.authorization = `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}`;
  }
  const res = await fetch(webhook, {
    method: "POST",
    headers,
    body: JSON.stringify({ from, ...input }),
  });
  if (!res.ok) {
    throw new Error(`Email webhook returned ${res.status}`);
  }
}
