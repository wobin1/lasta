"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import {
  ProductionError,
  assignProductionTask,
  claimProductionTask,
  completeProductionTask,
  startProductionTask,
} from "@/lib/production";
import { prisma } from "@/lib/prisma";
import { actionUser } from "@/lib/session";
import type { FormState } from "./customers";

export type { FormState };

function revalidateWork(orderId?: string) {
  revalidatePath("/production");
  revalidatePath("/production/me");
  revalidatePath("/production/available");
  revalidatePath("/finishing");
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

function taskIdFrom(formData: FormData) {
  return String(formData.get("taskId") ?? "").trim();
}

function asFormError(error: unknown): FormState {
  let current: unknown = error;
  for (let i = 0; i < 5 && current; i++) {
    if (current instanceof ProductionError) return { error: current.message };
    current = current instanceof Error ? current.cause : undefined;
  }
  if (error instanceof Error && error.message) {
    if (error.message.includes("Stock cannot go below zero")) {
      return { error: "There is not enough stock to start this stage." };
    }
    if (error.message.includes("Cannot issue more than is reserved")) {
      return { error: "Materials for this order are not fully reserved. Ask a manager to confirm the order." };
    }
    return { error: error.message };
  }
  return { error: "Could not update that stage. Try again." };
}

async function toast(message: string) {
  try {
    await flashSuccess(message);
  } catch {
    // Toast is optional; a cookie failure must not fail the stage update.
  }
}

export async function assignTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const authz = await actionUser("production.board");
  if ("error" in authz) return authz;
  const taskId = taskIdFrom(formData);
  if (!taskId) return { error: "That task was not found." };
  const workerId = String(formData.get("workerId") ?? "").trim();
  if (!workerId) return { error: "Choose a worker who has this template." };
  try {
    await assignProductionTask(taskId, workerId, authz.user.id);
  } catch (error) {
    return asFormError(error);
  }
  const task = await prisma.productionTask.findUnique({
    where: { id: taskId },
    include: { job: { include: { orderItem: true } } },
  });
  await writeAudit({
    actorId: authz.user.id,
    entity: "ProductionTask",
    entityId: taskId,
    action: "assign",
    after: { workerId },
  });
  revalidateWork(task?.job.orderItem.orderId);
  await toast("Task assigned");
  return {};
}

export async function claimTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const authz = await actionUser("production.work");
  if ("error" in authz) return authz;
  const taskId = taskIdFrom(formData);
  if (!taskId) return { error: "That task was not found." };
  try {
    await claimProductionTask(taskId, authz.user.id);
  } catch (error) {
    return asFormError(error);
  }
  const task = await prisma.productionTask.findUnique({
    where: { id: taskId },
    include: { job: { include: { orderItem: true } } },
  });
  revalidateWork(task?.job.orderItem.orderId);
  await writeAudit({
    actorId: authz.user.id,
    entity: "ProductionTask",
    entityId: taskId,
    action: "claim",
  });
  await toast("Task claimed");
  return {};
}

export async function startTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const authz = await actionUser("production.work");
  if ("error" in authz) return authz;
  const taskId = taskIdFrom(formData);
  if (!taskId) return { error: "That task was not found." };
  try {
    await startProductionTask(taskId, authz.user.id);
  } catch (error) {
    return asFormError(error);
  }
  const task = await prisma.productionTask.findUnique({
    where: { id: taskId },
    include: { job: { include: { orderItem: true } } },
  });
  await writeAudit({
    actorId: authz.user.id,
    entity: "ProductionTask",
    entityId: taskId,
    action: "start",
  });
  revalidateWork(task?.job.orderItem.orderId);
  await toast("Stage started");
  return {};
}

export async function completeTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const authz = await actionUser("production.work");
  if ("error" in authz) return authz;
  const taskId = taskIdFrom(formData);
  if (!taskId) return { error: "That task was not found." };
  let awaitingQc = false;
  try {
    const result = await completeProductionTask(taskId, authz.user.id);
    awaitingQc = result.awaitingQc;
  } catch (error) {
    return asFormError(error);
  }
  const task = await prisma.productionTask.findUnique({
    where: { id: taskId },
    include: { job: { include: { orderItem: true } } },
  });
  await writeAudit({
    actorId: authz.user.id,
    entity: "ProductionTask",
    entityId: taskId,
    action: "complete",
  });
  revalidateWork(task?.job.orderItem.orderId);
  revalidatePath("/qc");
  await toast(awaitingQc ? "Stage completed — waiting for QC" : "Stage completed");
  return {};
}
