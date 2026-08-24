import bcrypt from "bcryptjs";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const alreadySeeded = (await prisma.user.count()) > 0;
  if (alreadySeeded && process.env.SEED_FORCE !== "true") {
    console.log("Seed skipped: the database already has users.");
    return;
  }

  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@local.test";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "changeme";
  const salesEmail = process.env.SEED_SALES_EMAIL ?? "sales@local.test";
  const salesPassword = process.env.SEED_SALES_PASSWORD ?? "changeme";
  const inventoryEmail = process.env.SEED_INVENTORY_EMAIL ?? "inventory@local.test";
  const inventoryPassword = process.env.SEED_INVENTORY_PASSWORD ?? "changeme";

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: "Owner",
      role: "OWNER",
      passwordHash: await bcrypt.hash(ownerPassword, 12),
    },
  });

  await prisma.user.upsert({
    where: { email: salesEmail },
    update: {},
    create: {
      email: salesEmail,
      name: "Sales",
      role: "SALES",
      passwordHash: await bcrypt.hash(salesPassword, 12),
    },
  });

  await prisma.user.upsert({
    where: { email: inventoryEmail },
    update: {},
    create: {
      email: inventoryEmail,
      name: "Inventory",
      role: "INVENTORY",
      passwordHash: await bcrypt.hash(inventoryPassword, 12),
    },
  });

  await prisma.user.upsert({
    where: { email: process.env.SEED_QC_EMAIL ?? "qc@local.test" },
    update: { role: "QC" },
    create: {
      email: process.env.SEED_QC_EMAIL ?? "qc@local.test",
      name: "Quality control",
      role: "QC",
      passwordHash: await bcrypt.hash(process.env.SEED_QC_PASSWORD ?? "changeme", 12),
    },
  });

  await prisma.user.upsert({
    where: { email: process.env.SEED_PM_EMAIL ?? "pm@local.test" },
    update: {},
    create: {
      email: process.env.SEED_PM_EMAIL ?? "pm@local.test",
      name: "Production manager",
      role: "PRODUCTION_MANAGER",
      passwordHash: await bcrypt.hash(process.env.SEED_PM_PASSWORD ?? "changeme", 12),
    },
  });

  const categoryNames = ["Loafers", "Corporate shoes", "School shoes", "Sandals"];
  for (const name of categoryNames) {
    await prisma.productCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const loafers = await prisma.productCategory.findUniqueOrThrow({ where: { name: "Loafers" } });
  const corporate = await prisma.productCategory.findUniqueOrThrow({
    where: { name: "Corporate shoes" },
  });

  const sandalsCat = await prisma.productCategory.findUniqueOrThrow({ where: { name: "Sandals" } });

  const classic = await ensureTemplate("seed-template-classic-leather", "Classic leather", [
    "PATTERN_DRAFTING",
    "CUTTING",
    "STITCHING",
    "LASTING",
    "FILLING",
    "SOLE_ATTACHMENT",
    "FINISHING",
    "QC",
  ]);
  const sandalTemplate = await ensureTemplate("seed-template-sandal", "Sandal", [
    "PATTERN_DRAFTING",
    "CUTTING",
    "LASTING",
    "SOLE_ATTACHMENT",
    "FINISHING",
    "QC",
  ]);

  const loafer = await prisma.product.upsert({
    where: { id: "seed-classic-loafer" },
    update: { categoryId: loafers.id, productionTemplateId: classic.id },
    create: {
      id: "seed-classic-loafer",
      name: "Classic loafer",
      categoryId: loafers.id,
      description: "Plain leather loafer. Price is a shop default; confirm with the owner.",
      priceKobo: 15000000,
      productionDays: 14,
      productionTemplateId: classic.id,
    },
  });

  const oxford = await prisma.product.upsert({
    where: { id: "seed-oxford" },
    update: { categoryId: corporate.id, productionTemplateId: classic.id },
    create: {
      id: "seed-oxford",
      name: "Oxford",
      categoryId: corporate.id,
      description: "Closed-lacing corporate oxford.",
      priceKobo: 18500000,
      productionDays: 18,
      productionTemplateId: classic.id,
    },
  });

  const sandal = await prisma.product.upsert({
    where: { id: "seed-sandal" },
    update: { categoryId: sandalsCat.id, productionTemplateId: sandalTemplate.id },
    create: {
      id: "seed-sandal",
      name: "Open sandal",
      categoryId: sandalsCat.id,
      description: "Open sandal. Lasting without a stitching stage.",
      priceKobo: 12000000,
      productionDays: 10,
      productionTemplateId: sandalTemplate.id,
    },
  });

  const leather = await prisma.inventoryItem.upsert({
    where: { id: "seed-black-calf" },
    update: { name: "Black calf leather", minStock: 5, reorderLevel: 8 },
    create: {
      id: "seed-black-calf",
      name: "Black calf leather",
      category: "LEATHER",
      color: "Black",
      type: "Calf",
      unit: "METRE",
      minStock: 5,
      reorderLevel: 8,
    },
  });

  const soles = await prisma.inventoryItem.upsert({
    where: { id: "seed-loafer-soles" },
    update: { name: "Loafer rubber soles", minStock: 10, reorderLevel: 20 },
    create: {
      id: "seed-loafer-soles",
      name: "Loafer rubber soles",
      category: "SOLES",
      type: "Rubber",
      unit: "PAIR",
      minStock: 10,
      reorderLevel: 20,
    },
  });

  const lining = await prisma.inventoryItem.upsert({
    where: { id: "seed-gold-lining" },
    update: { name: "Gold lining", minStock: 2, reorderLevel: 3 },
    create: {
      id: "seed-gold-lining",
      name: "Gold lining",
      category: "LINING",
      color: "Gold",
      unit: "METRE",
      minStock: 2,
      reorderLevel: 3,
    },
  });

  await ensureOpeningStock(leather.id, 20, owner.id);
  await ensureOpeningStock(soles.id, 50, owner.id);
  await ensureOpeningStock(lining.id, 0.5, owner.id);

  await prisma.bomLine.upsert({
    where: {
      productId_inventoryItemId: { productId: loafer.id, inventoryItemId: leather.id },
    },
    update: { qtyPerPair: new Prisma.Decimal("0.400"), unit: "METRE" },
    create: {
      productId: loafer.id,
      inventoryItemId: leather.id,
      qtyPerPair: new Prisma.Decimal("0.400"),
      unit: "METRE",
    },
  });
  await prisma.bomLine.upsert({
    where: {
      productId_inventoryItemId: { productId: loafer.id, inventoryItemId: soles.id },
    },
    update: { qtyPerPair: new Prisma.Decimal("1"), unit: "PAIR" },
    create: {
      productId: loafer.id,
      inventoryItemId: soles.id,
      qtyPerPair: new Prisma.Decimal("1"),
      unit: "PAIR",
    },
  });
  await prisma.bomLine.upsert({
    where: {
      productId_inventoryItemId: { productId: oxford.id, inventoryItemId: lining.id },
    },
    update: { qtyPerPair: new Prisma.Decimal("0.800"), unit: "METRE" },
    create: {
      productId: oxford.id,
      inventoryItemId: lining.id,
      qtyPerPair: new Prisma.Decimal("0.800"),
      unit: "METRE",
    },
  });

  await prisma.bomLine.upsert({
    where: {
      productId_inventoryItemId: { productId: sandal.id, inventoryItemId: soles.id },
    },
    update: { qtyPerPair: new Prisma.Decimal("1"), unit: "PAIR" },
    create: {
      productId: sandal.id,
      inventoryItemId: soles.id,
      qtyPerPair: new Prisma.Decimal("1"),
      unit: "PAIR",
    },
  });

  const ada = await prisma.user.upsert({
    where: { email: "ada@local.test" },
    update: { role: "PRODUCTION_WORKER" },
    create: {
      email: "ada@local.test",
      name: "Ada",
      role: "PRODUCTION_WORKER",
      passwordHash: await bcrypt.hash("changeme", 12),
    },
  });
  const chidi = await prisma.user.upsert({
    where: { email: "chidi@local.test" },
    update: { role: "PRODUCTION_WORKER" },
    create: {
      email: "chidi@local.test",
      name: "Chidi",
      role: "PRODUCTION_WORKER",
      passwordHash: await bcrypt.hash("changeme", 12),
    },
  });
  const fini = await prisma.user.upsert({
    where: { email: "finishing@local.test" },
    update: { role: "FINISHING_WORKER" },
    create: {
      email: "finishing@local.test",
      name: "Finishing",
      role: "FINISHING_WORKER",
      passwordHash: await bcrypt.hash("changeme", 12),
    },
  });
  await prisma.user.upsert({
    where: { email: process.env.SEED_DELIVERY_EMAIL ?? "delivery@local.test" },
    update: { role: "DELIVERY" },
    create: {
      email: process.env.SEED_DELIVERY_EMAIL ?? "delivery@local.test",
      name: "Delivery",
      role: "DELIVERY",
      passwordHash: await bcrypt.hash(process.env.SEED_DELIVERY_PASSWORD ?? "changeme", 12),
    },
  });

  await prisma.workerTemplate.deleteMany({
    where: { userId: { in: [ada.id, chidi.id, fini.id] } },
  });
  await prisma.workerTemplate.createMany({
    data: [
      { userId: ada.id, templateId: classic.id },
      { userId: ada.id, templateId: sandalTemplate.id },
      { userId: chidi.id, templateId: sandalTemplate.id },
      { userId: fini.id, templateId: classic.id },
      { userId: fini.id, templateId: sandalTemplate.id },
    ],
  });

  console.log(
    "Seeded stock, BOM, templates, Ada, Chidi, finishing, QC, and delivery (delivery@local.test).",
  );
}

async function ensureTemplate(
  id: string,
  name: string,
  stages: Array<
    | "PATTERN_DRAFTING"
    | "CUTTING"
    | "STITCHING"
    | "LASTING"
    | "FILLING"
    | "SOLE_ATTACHMENT"
    | "FINISHING"
    | "QC"
  >,
) {
  const template = await prisma.productionTemplate.upsert({
    where: { id },
    update: { name },
    create: { id, name },
  });
  const jobs = await prisma.productionJob.count({ where: { templateId: template.id } });
  if (jobs === 0) {
    await prisma.templateStage.deleteMany({ where: { templateId: template.id } });
    await prisma.templateStage.createMany({
      data: stages.map((stage, sortOrder) => ({ templateId: template.id, stage, sortOrder })),
    });
  }
  return template;
}

async function ensureOpeningStock(itemId: string, qty: number, actorId: string) {
  const existing = await prisma.inventoryTransaction.findFirst({
    where: { itemId, reason: "Opening stock" },
  });
  if (existing) return;
  await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: itemId } });
    await tx.inventoryTransaction.create({
      data: {
        itemId,
        type: "PURCHASE",
        qty: new Prisma.Decimal(qty.toFixed(3)),
        unit: item.unit,
        reason: "Opening stock",
        createdById: actorId,
      },
    });
    await tx.inventoryItem.update({
      where: { id: itemId },
      data: { qtyOnHand: new Prisma.Decimal(qty.toFixed(3)) },
    });
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
