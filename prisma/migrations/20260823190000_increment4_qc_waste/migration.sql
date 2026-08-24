-- AlterEnum
ALTER TYPE "ProductionTaskStatus" ADD VALUE 'AWAITING_QC';

-- CreateEnum
CREATE TYPE "QcCheckpoint" AS ENUM ('CUTTING', 'STITCHING', 'LASTING', 'FINAL');

-- CreateEnum
CREATE TYPE "QcResult" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "WasteReason" AS ENUM ('CUTTING_ERROR', 'MATERIAL_DEFECT', 'BAD_MEASUREMENT', 'DAMAGED', 'PRODUCTION_MISTAKE', 'DESIGN_CHANGE', 'OTHER');

-- CreateTable
CREATE TABLE "QualityCheck" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "checkpoint" "QcCheckpoint" NOT NULL,
    "result" "QcResult" NOT NULL,
    "checklist" JSONB NOT NULL,
    "notes" TEXT,
    "inspectorId" TEXT NOT NULL,
    "productionTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Defect" (
    "id" TEXT NOT NULL,
    "qualityCheckId" TEXT NOT NULL,
    "checkpoint" "QcCheckpoint" NOT NULL,
    "reason" TEXT NOT NULL,
    "workerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Defect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteRecord" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DECIMAL(14,3) NOT NULL,
    "reason" "WasteReason" NOT NULL,
    "orderId" TEXT,
    "stage" "ProductionStage",
    "taskId" TEXT,
    "transactionId" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WasteRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QualityCheck_orderItemId_checkpoint_idx" ON "QualityCheck"("orderItemId", "checkpoint");

-- CreateIndex
CREATE INDEX "QualityCheck_productionTaskId_idx" ON "QualityCheck"("productionTaskId");

-- CreateIndex
CREATE INDEX "Defect_checkpoint_idx" ON "Defect"("checkpoint");

-- CreateIndex
CREATE INDEX "Defect_createdAt_idx" ON "Defect"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WasteRecord_transactionId_key" ON "WasteRecord"("transactionId");

-- CreateIndex
CREATE INDEX "WasteRecord_orderId_idx" ON "WasteRecord"("orderId");

-- CreateIndex
CREATE INDEX "WasteRecord_itemId_idx" ON "WasteRecord"("itemId");

-- CreateIndex
CREATE INDEX "WasteRecord_createdAt_idx" ON "WasteRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityCheck" ADD CONSTRAINT "QualityCheck_productionTaskId_fkey" FOREIGN KEY ("productionTaskId") REFERENCES "ProductionTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_qualityCheckId_fkey" FOREIGN KEY ("qualityCheckId") REFERENCES "QualityCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProductionTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "InventoryTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteRecord" ADD CONSTRAINT "WasteRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
