import { InventoryUnit, OrderStatus, QcCheckpoint } from "@prisma/client";
import { startOfTodayLagos } from "./dates";
import { asQty } from "./inventory";
import { formatQty } from "./labels";
import { prisma } from "./prisma";
import { qcCheckpointLabel } from "./qc-checklists";
import { productionStageLabel } from "./stages";

export async function loadOwnerReports(from: Date, to: Date) {
  const closed: OrderStatus[] = ["CANCELLED"];
  const [
    ordersInPeriod,
    openCount,
    overdue,
    readyCount,
    outstandingOrders,
    payments,
    items,
    waste,
    purchases,
    defects,
    checks,
    finishingWait,
    issueTxns,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.order.count({ where: { status: { notIn: ["CANCELLED", "COMPLETED", "DELIVERED"] } } }),
    prisma.order.findMany({
      where: {
        requiredDate: { lt: startOfTodayLagos() },
        status: { notIn: ["CANCELLED", "COMPLETED", "DELIVERED"] },
      },
      include: { customer: true },
      orderBy: { requiredDate: "asc" },
      take: 20,
    }),
    prisma.order.count({ where: { status: "READY_FOR_DELIVERY" } }),
    prisma.order.findMany({
      where: { status: { notIn: closed } },
      include: { payments: true },
    }),
    prisma.payment.findMany({
      where: { paidAt: { gte: from, lt: to } },
    }),
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: from, lt: to }, status: { not: "CANCELLED" } } },
      include: {
        product: { include: { bomLines: { include: { inventoryItem: true } } } },
        order: true,
      },
    }),
    prisma.wasteRecord.findMany({
      where: { createdAt: { gte: from, lt: to } },
      include: { item: true },
    }),
    prisma.inventoryTransaction.findMany({
      where: {
        type: "PURCHASE",
        createdAt: { gte: from, lt: to },
        NOT: { reason: "Opening stock" },
      },
      include: { item: true },
    }),
    prisma.defect.findMany({
      where: { createdAt: { gte: from, lt: to } },
      include: { worker: true },
    }),
    prisma.qualityCheck.findMany({
      where: { createdAt: { gte: from, lt: to } },
    }),
    prisma.productionTask.findMany({
      where: { stage: "FINISHING", status: { in: ["ASSIGNED", "STARTED"] } },
      include: { job: { include: { orderItem: { include: { order: true, product: true } } } } },
      orderBy: { enteredAt: "asc" },
      take: 12,
    }),
    prisma.inventoryTransaction.findMany({
      where: { type: "ISSUE", createdAt: { gte: from, lt: to } },
      include: { item: true },
    }),
  ]);

  const paidKobo = payments.reduce((sum, row) => sum + row.amountKobo, 0);
  const outstandingKobo = outstandingOrders.reduce((sum, order) => {
    const paid = order.payments.reduce((inner, row) => inner + row.amountKobo, 0);
    return sum + Math.max(0, order.totalKobo - paid);
  }, 0);

  const productSales = new Map<string, { name: string; pairs: number; revenueKobo: number; costKobo: number }>();
  const colorSales = new Map<string, number>();
  for (const line of items) {
    const current = productSales.get(line.productId) ?? {
      name: line.product.name,
      pairs: 0,
      revenueKobo: 0,
      costKobo: 0,
    };
    current.pairs += line.quantity;
    current.revenueKobo += line.unitPriceKobo * line.quantity;
    for (const bom of line.product.bomLines) {
      const cost = bom.inventoryItem.costKobo ?? 0;
      current.costKobo += Math.round(asQty(bom.qtyPerPair) * line.quantity * cost);
      const color = bom.inventoryItem.color?.trim();
      if (color) colorSales.set(color, (colorSales.get(color) ?? 0) + line.quantity);
    }
    productSales.set(line.productId, current);
  }

  const leatherWaste = waste.filter((row) => row.item.category === "LEATHER");
  const leatherByUnit = new Map<InventoryUnit, number>();
  for (const row of leatherWaste) {
    leatherByUnit.set(row.item.unit, (leatherByUnit.get(row.item.unit) ?? 0) + asQty(row.qty));
  }
  const leatherWasteLabel =
    leatherByUnit.size === 0
      ? "0"
      : [...leatherByUnit.entries()].map(([unit, qty]) => formatQty(qty, unit)).join(" · ");
  const wasteKobo = waste.reduce((sum, row) => sum + Math.round(asQty(row.qty) * (row.item.costKobo ?? 0)), 0);
  const issuedKobo = issueTxns.reduce((sum, row) => sum + Math.round(asQty(row.qty) * (row.item.costKobo ?? 0)), 0);
  const wastePct = issuedKobo + wasteKobo > 0 ? Math.round((wasteKobo / (issuedKobo + wasteKobo)) * 1000) / 10 : 0;

  const defectsByStage = new Map<QcCheckpoint, number>();
  const defectsByWorker = new Map<string, { name: string; defects: number }>();
  for (const defect of defects) {
    defectsByStage.set(defect.checkpoint, (defectsByStage.get(defect.checkpoint) ?? 0) + 1);
    if (defect.workerId && defect.worker) {
      const current = defectsByWorker.get(defect.workerId) ?? { name: defect.worker.name, defects: 0 };
      current.defects += 1;
      defectsByWorker.set(defect.workerId, current);
    }
  }

  const spendKobo = purchases.reduce((sum, row) => sum + Math.round(asQty(row.qty) * (row.item.costKobo ?? 0)), 0);

  const jobs = await prisma.productionJob.findMany({
    where: {
      createdAt: { gte: from, lt: to },
      orderItem: { order: { status: { in: ["READY_FOR_DELIVERY", "DISPATCHED", "DELIVERED", "COMPLETED"] } } },
    },
    include: {
      tasks: true,
      orderItem: { include: { order: true } },
    },
  });
  const durations: number[] = [];
  for (const job of jobs) {
    const last = job.tasks.reduce((max, task) => {
      const at = task.completedAt?.getTime() ?? 0;
      return at > max ? at : max;
    }, 0);
    if (last > 0) durations.push((last - job.createdAt.getTime()) / 86400000);
  }
  const avgProductionDays =
    durations.length === 0 ? null : Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10;

  const periodCustomerIds = [...new Set(items.map((line) => line.order.customerId))];
  const repeatCustomers =
    periodCustomerIds.length === 0
      ? []
      : (
          await prisma.customer.findMany({
            where: { id: { in: periodCustomerIds } },
            include: {
              orders: {
                where: { status: { not: "CANCELLED" } },
                orderBy: { createdAt: "desc" },
                select: { id: true, publicId: true },
              },
            },
          })
        )
          .filter((customer) => customer.orders.length > 1)
          .sort((a, b) => b.orders.length - a.orders.length)
          .slice(0, 8)
          .map((customer) => ({
            id: customer.id,
            name: customer.fullName,
            orderCount: customer.orders.length,
            lastPublicId: customer.orders[0]?.publicId ?? "",
            lastOrderId: customer.orders[0]?.id ?? "",
          }));

  return {
    ordersInPeriod,
    openCount,
    overdue,
    readyCount,
    paidKobo,
    outstandingKobo,
    checkCount: checks.length,
    failCount: checks.filter((row) => row.result === "FAIL").length,
    leatherWasteLabel,
    wastePct,
    spendKobo,
    avgProductionDays,
    topProducts: [...productSales.values()]
      .sort((a, b) => b.pairs - a.pairs)
      .slice(0, 8)
      .map((row) => ({
        ...row,
        marginKobo: row.revenueKobo - row.costKobo,
      })),
    topColors: [...colorSales.entries()]
      .map(([color, pairs]) => ({ color, pairs }))
      .sort((a, b) => b.pairs - a.pairs)
      .slice(0, 8),
    defectsByStage: (Object.keys(qcCheckpointLabel) as QcCheckpoint[]).map((checkpoint) => ({
      checkpoint,
      label: qcCheckpointLabel[checkpoint],
      count: defectsByStage.get(checkpoint) ?? 0,
    })),
    defectsByWorker: [...defectsByWorker.values()].sort((a, b) => b.defects - a.defects).slice(0, 8),
    finishingWait: finishingWait.map((task) => ({
      id: task.id,
      orderId: task.job.orderItem.order.id,
      publicId: task.job.orderItem.order.publicId,
      productName: task.job.orderItem.product.name,
      enteredAt: task.enteredAt,
      stageLabel: productionStageLabel[task.stage],
    })),
    repeatCustomers,
  };
}
