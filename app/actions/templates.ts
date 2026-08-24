"use server";

import { ProductionStage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { PRODUCTION_STAGES } from "@/lib/stages";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import type { FormState } from "./customers";

export type { FormState };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseStages(formData: FormData): ProductionStage[] {
  const selected = formData.getAll("stages").map((value) => String(value)) as ProductionStage[];
  return PRODUCTION_STAGES.filter((stage) => selected.includes(stage));
}

export async function createTemplate(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requirePermission("templates.write");
  const name = str(formData, "name");
  const stages = parseStages(formData);
  if (!name) return { error: "Name is required." };
  if (stages.length === 0) return { error: "Tick at least one stage." };

  const template = await prisma.productionTemplate.create({
    data: {
      name,
      stages: {
        create: stages.map((stage, index) => ({ stage, sortOrder: index })),
      },
    },
  });
  await writeAudit({
    actorId: user.id,
    entity: "ProductionTemplate",
    entityId: template.id,
    action: "create",
    after: { name, stages },
  });
  revalidatePath("/settings/templates");
  await flashSuccess("Template created");
  redirect(`/settings/templates/${template.id}`);
}

export async function updateTemplate(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("templates.write");
  const name = str(formData, "name");
  const stages = parseStages(formData);
  if (!name) return { error: "Name is required." };
  if (stages.length === 0) return { error: "Tick at least one stage." };

  const before = await prisma.productionTemplate.findUnique({
    where: { id },
    include: { _count: { select: { jobs: true } } },
  });
  if (!before) return { error: "Template was not found." };
  if (before._count.jobs > 0) {
    await prisma.productionTemplate.update({ where: { id }, data: { name } });
    await writeAudit({
      actorId: user.id,
      entity: "ProductionTemplate",
      entityId: id,
      action: "update",
      after: { name, stagesLocked: true },
    });
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.templateStage.deleteMany({ where: { templateId: id } });
      await tx.productionTemplate.update({
        where: { id },
        data: {
          name,
          stages: { create: stages.map((stage, index) => ({ stage, sortOrder: index })) },
        },
      });
    });
    await writeAudit({
      actorId: user.id,
      entity: "ProductionTemplate",
      entityId: id,
      action: "update",
      after: { name, stages },
    });
  }
  revalidatePath("/settings/templates");
  revalidatePath(`/settings/templates/${id}`);
  await flashSuccess("Template saved");
  return {};
}

export async function saveWorkerTemplates(userId: string, formData: FormData) {
  const actor = await requirePermission("users.write");
  const ids = formData.getAll("templateId").map((value) => String(value));
  await prisma.$transaction(async (tx) => {
    await tx.workerTemplate.deleteMany({ where: { userId } });
    if (ids.length) {
      await tx.workerTemplate.createMany({
        data: ids.map((templateId) => ({ userId, templateId })),
      });
    }
  });
  await writeAudit({
    actorId: actor.id,
    entity: "User",
    entityId: userId,
    action: "templates",
    after: { templates: ids.length },
  });
  revalidatePath(`/settings/users/${userId}`);
  await flashSuccess("Templates saved for this worker");
}
