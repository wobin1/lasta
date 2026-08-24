-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('PICKUP', 'RIDER');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('READY', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED', 'FAILED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentOverride" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "paymentOverrideAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "paymentOverrideById" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentOverrideReason" TEXT;

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" "DeliveryType" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'READY',
    "address" TEXT,
    "phone" TEXT NOT NULL,
    "riderUserId" TEXT,
    "feeKobo" INTEGER NOT NULL DEFAULT 0,
    "failReason" TEXT,
    "notes" TEXT,
    "readyAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "inTransitAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_orderId_key" ON "Delivery"("orderId");

-- CreateIndex
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");

-- CreateIndex
CREATE INDEX "Delivery_riderUserId_idx" ON "Delivery"("riderUserId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_paymentOverrideById_fkey" FOREIGN KEY ("paymentOverrideById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_riderUserId_fkey" FOREIGN KEY ("riderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
