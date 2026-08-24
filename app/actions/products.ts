"use server";

import { ProductionStage } from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { parseNairaToKobo } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import type { FormState } from "./customers";

export type { FormState };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createProduct(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("products.write");
  const name = str(formData, "name");
  const categoryId = str(formData, "categoryId");
  const priceKobo = parseNairaToKobo(str(formData, "priceNaira"));
  if (!name || !categoryId) return { error: "Name and category are required." };
  if (priceKobo === null) return { error: "Enter a valid price in naira." };

  const category = await prisma.productCategory.findUnique({ where: { id: categoryId } });
  if (!category) return { error: "Choose a category from the list." };

  const days = Number(str(formData, "productionDays") || "14");
  const productionTemplateId = str(formData, "productionTemplateId") || null;
  const product = await prisma.product.create({
    data: {
      name,
      categoryId,
      description: str(formData, "description") || null,
      priceKobo,
      productionDays: Number.isFinite(days) && days > 0 ? days : 14,
      imageUrl: str(formData, "imageUrl") || null,
      productionTemplateId,
    },
  });
  await writeAudit({
    actorId: user.id,
    entity: "Product",
    entityId: product.id,
    action: "create",
    after: { name, priceKobo },
  });
  revalidatePath("/products");
  await flashSuccess("Product created");
  redirect(`/products/${product.id}`);
}

export async function updateProduct(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("products.write");
  const name = str(formData, "name");
  const categoryId = str(formData, "categoryId");
  const priceKobo = parseNairaToKobo(str(formData, "priceNaira"));
  if (!name || !categoryId) return { error: "Name and category are required." };
  if (priceKobo === null) return { error: "Enter a valid price in naira." };

  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return { error: "Product was not found." };
  const category = await prisma.productCategory.findUnique({ where: { id: categoryId } });
  if (!category) return { error: "Choose a category from the list." };

  const days = Number(str(formData, "productionDays") || String(before.productionDays));
  const productionTemplateId = str(formData, "productionTemplateId") || null;
  const omitStages = formData.getAll("omitStage").map((value) => String(value)) as ProductionStage[];
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        name,
        categoryId,
        description: str(formData, "description") || null,
        priceKobo,
        productionDays: Number.isFinite(days) && days > 0 ? days : before.productionDays,
        status: (str(formData, "status") as never) || before.status,
        imageUrl: str(formData, "imageUrl") || null,
        productionTemplateId,
      },
    });
    await tx.productStageOmit.deleteMany({ where: { productId: id } });
    if (omitStages.length) {
      await tx.productStageOmit.createMany({
        data: omitStages.map((stage) => ({ productId: id, stage })),
      });
    }
  });
  await writeAudit({
    actorId: user.id,
    entity: "Product",
    entityId: id,
    action: "update",
    before: { name: before.name, priceKobo: before.priceKobo },
    after: { name, priceKobo },
  });
  revalidatePath(`/products/${id}`);
  revalidatePath("/products");
  await flashSuccess("Product saved");
  return {};
}

export async function deleteProduct(id: string, _formData: FormData) {
  const user = await requirePermission("products.delete");
  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!product) return;
  if (product._count.orderItems > 0) return;

  await prisma.product.delete({ where: { id } });
  await writeAudit({
    actorId: user.id,
    entity: "Product",
    entityId: id,
    action: "delete",
    before: { name: product.name, categoryId: product.categoryId },
  });
  revalidatePath("/products");
  await flashSuccess("Product deleted");
  redirect("/products");
}
