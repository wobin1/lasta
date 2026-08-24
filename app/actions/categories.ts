"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import type { FormState } from "./customers";

export type { FormState };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function revalidateCatalog() {
  revalidatePath("/products");
  revalidatePath("/products/categories");
  revalidatePath("/products/new");
}

export async function createCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("categories.write");
  const name = str(formData, "name");
  if (!name) return { error: "Enter a category name." };

  try {
    const category = await prisma.productCategory.create({ data: { name } });
    await writeAudit({
      actorId: user.id,
      entity: "ProductCategory",
      entityId: category.id,
      action: "create",
      after: { name },
    });
    revalidateCatalog();
    await flashSuccess("Category added");
    return {};
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That category already exists." };
    }
    throw error;
  }
}

export async function updateCategory(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("categories.write");
  const name = str(formData, "name");
  if (!name) return { error: "Enter a category name." };

  const before = await prisma.productCategory.findUnique({ where: { id } });
  if (!before) return { error: "Category was not found." };

  try {
    await prisma.productCategory.update({ where: { id }, data: { name } });
    await writeAudit({
      actorId: user.id,
      entity: "ProductCategory",
      entityId: id,
      action: "update",
      before: { name: before.name },
      after: { name },
    });
    revalidateCatalog();
    await flashSuccess("Category saved");
    return {};
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "That category already exists." };
    }
    throw error;
  }
}

export async function deleteCategory(id: string, _formData: FormData) {
  const user = await requirePermission("categories.write");
  const category = await prisma.productCategory.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) return;
  if (category._count.products > 0) return;

  await prisma.productCategory.delete({ where: { id } });
  await writeAudit({
    actorId: user.id,
    entity: "ProductCategory",
    entityId: id,
    action: "delete",
    before: { name: category.name },
  });
  revalidateCatalog();
  await flashSuccess("Category deleted");
}
