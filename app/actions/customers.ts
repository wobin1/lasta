"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { nextPublicId } from "@/lib/ids";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export type FormState = { error?: string };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createCustomer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("customers.write");
  const fullName = str(formData, "fullName");
  const phone = str(formData, "phone").replace(/\s+/g, "");
  if (!fullName || !phone) {
    return { error: "Name and phone are required." };
  }

  try {
    const publicId = await nextPublicId("CUS");
    const customer = await prisma.customer.create({
      data: {
        publicId,
        fullName,
        phone,
        email: str(formData, "email") || null,
        address: str(formData, "address") || null,
        type: (str(formData, "type") as never) || "INDIVIDUAL",
        source: (str(formData, "source") as never) || "WALK_IN",
        notes: str(formData, "notes") || null,
      },
    });
    await writeAudit({
      actorId: user.id,
      entity: "Customer",
      entityId: customer.id,
      action: "create",
      after: { publicId, fullName, phone },
    });
    revalidatePath("/customers");
    await flashSuccess("Customer created");
    redirect(`/customers/${customer.id}`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A customer with this phone number already exists." };
    }
    throw error;
  }
}

export async function updateCustomer(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("customers.write");
  const fullName = str(formData, "fullName");
  const phone = str(formData, "phone").replace(/\s+/g, "");
  if (!fullName || !phone) {
    return { error: "Name and phone are required." };
  }

  const before = await prisma.customer.findUnique({ where: { id } });
  if (!before) return { error: "Customer was not found." };

  try {
    await prisma.customer.update({
      where: { id },
      data: {
        fullName,
        phone,
        email: str(formData, "email") || null,
        address: str(formData, "address") || null,
        type: (str(formData, "type") as never) || before.type,
        source: (str(formData, "source") as never) || before.source,
        notes: str(formData, "notes") || null,
      },
    });
    await writeAudit({
      actorId: user.id,
      entity: "Customer",
      entityId: id,
      action: "update",
      before: { fullName: before.fullName, phone: before.phone },
      after: { fullName, phone },
    });
    revalidatePath(`/customers/${id}`);
    revalidatePath("/customers");
    await flashSuccess("Customer saved");
    return {};
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A customer with this phone number already exists." };
    }
    throw error;
  }
}

export async function deleteCustomer(id: string, _formData: FormData) {
  const user = await requirePermission("customers.delete");
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!customer) return;
  if (customer._count.orders > 0) return;

  await prisma.$transaction([
    prisma.measurement.deleteMany({ where: { customerId: id } }),
    prisma.customer.delete({ where: { id } }),
  ]);
  await writeAudit({
    actorId: user.id,
    entity: "Customer",
    entityId: id,
    action: "delete",
    before: { publicId: customer.publicId, fullName: customer.fullName, phone: customer.phone },
  });
  revalidatePath("/customers");
  await flashSuccess("Customer deleted");
  redirect("/customers");
}

export async function createMeasurement(
  customerId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("customers.write");
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { error: "Customer was not found." };

  const num = (key: string) => {
    const raw = str(formData, key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  const measurement = await prisma.measurement.create({
    data: {
      customerId,
      measuredByUserId: user.id,
      leftLength: num("leftLength"),
      leftWidth: num("leftWidth"),
      leftInstep: num("leftInstep"),
      leftHeel: num("leftHeel"),
      leftAnkle: num("leftAnkle"),
      rightLength: num("rightLength"),
      rightWidth: num("rightWidth"),
      rightInstep: num("rightInstep"),
      rightHeel: num("rightHeel"),
      rightAnkle: num("rightAnkle"),
      notes: str(formData, "notes") || null,
    },
  });
  await writeAudit({
    actorId: user.id,
    entity: "Measurement",
    entityId: measurement.id,
    action: "create",
    after: { customerId },
  });
  revalidatePath(`/customers/${customerId}`);
  await flashSuccess("Measurement saved");
  redirect(`/customers/${customerId}`);
}
