-- CreateEnum
CREATE TYPE "ProductionStage" AS ENUM ('PATTERN_DRAFTING', 'CUTTING', 'STITCHING', 'LASTING', 'FILLING', 'SOLE_ATTACHMENT', 'FINISHING', 'QC');

-- CreateEnum
CREATE TYPE "ProductionTaskStatus" AS ENUM ('ASSIGNED', 'STARTED', 'COMPLETED', 'BLOCKED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "productionTemplateId" TEXT;

-- AlterTable
ALTER TABLE "InventoryTransaction" ADD COLUMN "taskId" TEXT;

-- CreateTable
CREATE TABLE "ProductionTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateStage" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "stage" "ProductionStage" NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "TemplateStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerTemplate" (
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "WorkerTemplate_pkey" PRIMARY KEY ("userId","templateId")
);

-- CreateTable
CREATE TABLE "ProductStageOmit" (
    "productId" TEXT NOT NULL,
    "stage" "ProductionStage" NOT NULL,

    CONSTRAINT "ProductStageOmit_pkey" PRIMARY KEY ("productId","stage")
);

-- CreateTable
CREATE TABLE "ProductionJob" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionTask" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stage" "ProductionStage" NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "workerId" TEXT,
    "qty" INTEGER NOT NULL,
    "status" "ProductionTaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ProductionTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductionTemplate_name_key" ON "ProductionTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateStage_templateId_stage_key" ON "TemplateStage"("templateId", "stage");

-- CreateIndex
CREATE INDEX "TemplateStage_templateId_sortOrder_idx" ON "TemplateStage"("templateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionJob_orderItemId_key" ON "ProductionJob"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionTask_jobId_stage_key" ON "ProductionTask"("jobId", "stage");

-- CreateIndex
CREATE INDEX "ProductionTask_stage_status_idx" ON "ProductionTask"("stage", "status");

-- CreateIndex
CREATE INDEX "ProductionTask_workerId_idx" ON "ProductionTask"("workerId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Product_productionTemplateId_idx" ON "Product"("productionTemplateId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_taskId_idx" ON "InventoryTransaction"("taskId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productionTemplateId_fkey" FOREIGN KEY ("productionTemplateId") REFERENCES "ProductionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ProductionTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateStage" ADD CONSTRAINT "TemplateStage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerTemplate" ADD CONSTRAINT "WorkerTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerTemplate" ADD CONSTRAINT "WorkerTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStageOmit" ADD CONSTRAINT "ProductStageOmit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProductionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionTask" ADD CONSTRAINT "ProductionTask_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
