"use server";

import { Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import type { FormState } from "./customers";

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createStaffUser(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requirePermission("users.write");
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const role = str(formData, "role") as Role;
  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }
  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
  }
  if (!Object.values(Role).includes(role)) {
    return { error: "Choose a valid role." };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "That email already has an account." };

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  await writeAudit({
    actorId: actor.id,
    entity: "User",
    entityId: user.id,
    action: "create",
    after: { email, role },
  });
  revalidatePath("/settings/users");
  await flashSuccess("Staff account created");
  redirect("/settings/users");
}

export async function updateStaffUser(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requirePermission("users.write");
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const role = str(formData, "role") as Role;
  if (!name || !email) {
    return { error: "Name and email are required." };
  }
  if (password && password.length < 8) {
    return { error: "Use a password of at least 8 characters, or leave it blank." };
  }
  if (!Object.values(Role).includes(role)) {
    return { error: "Choose a valid role." };
  }

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return { error: "That staff account was not found." };

  if (before.role === "OWNER" && role !== "OWNER") {
    const otherOwners = await prisma.user.count({
      where: { role: "OWNER", active: true, id: { not: id } },
    });
    if (otherOwners === 0) {
      return { error: "Keep at least one active owner on the system." };
    }
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
      },
    });
    await writeAudit({
      actorId: actor.id,
      entity: "User",
      entityId: id,
      action: "update",
      before: { name: before.name, email: before.email, role: before.role },
      after: { name, email, role, passwordChanged: Boolean(password) },
    });
    revalidatePath("/settings/users");
    revalidatePath(`/settings/users/${id}`);
    await flashSuccess("Staff saved");
    return {};
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That email already has an account." };
    }
    throw error;
  }
}

export async function setStaffActive(id: string, formData: FormData) {
  const actor = await requirePermission("users.write");
  const nextActive = str(formData, "active") === "true";
  if (id === actor.id) return;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return;

  if (target.role === "OWNER" && target.active && !nextActive) {
    const otherOwners = await prisma.user.count({
      where: { role: "OWNER", active: true, id: { not: id } },
    });
    if (otherOwners === 0) return;
  }

  await prisma.user.update({ where: { id }, data: { active: nextActive } });
  await writeAudit({
    actorId: actor.id,
    entity: "User",
    entityId: id,
    action: nextActive ? "activate" : "deactivate",
    before: { active: target.active, email: target.email },
    after: { active: nextActive },
  });
  revalidatePath("/settings/users");
  revalidatePath(`/settings/users/${id}`);
  await flashSuccess(nextActive ? `${target.name} can sign in again` : `${target.name} can no longer sign in`);
}
