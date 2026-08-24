-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- Backfill from the previous free-text category column
INSERT INTO "ProductCategory" ("id", "name")
SELECT md5('category:' || "category"), "category"
FROM (SELECT DISTINCT "category" FROM "Product") AS cats;

UPDATE "Product" AS p
SET "categoryId" = c."id"
FROM "ProductCategory" AS c
WHERE c."name" = p."category";

INSERT INTO "ProductCategory" ("id", "name")
SELECT 'seed-uncategorized', 'Uncategorized'
WHERE EXISTS (SELECT 1 FROM "Product" WHERE "categoryId" IS NULL)
  AND NOT EXISTS (SELECT 1 FROM "ProductCategory" WHERE "name" = 'Uncategorized');

UPDATE "Product"
SET "categoryId" = (SELECT "id" FROM "ProductCategory" WHERE "name" = 'Uncategorized')
WHERE "categoryId" IS NULL;

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "category";

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
