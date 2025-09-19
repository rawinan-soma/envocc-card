/*
  Warnings:

  - You are about to drop the column `epositionId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `epositions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orgOnProvince` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."epositions" DROP CONSTRAINT "epositions_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."organizations" DROP CONSTRAINT "organizations_provinceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_epositionId_fkey";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "epositionId";

-- DropTable
DROP TABLE "public"."epositions";

-- DropTable
DROP TABLE "public"."orgOnProvince";

-- CreateTable
CREATE TABLE "public"."province" (
    "provinceId" INTEGER NOT NULL,
    "health_region" INTEGER NOT NULL,
    "name_th" TEXT NOT NULL,
    "name_eng" TEXT NOT NULL,

    CONSTRAINT "province_pkey" PRIMARY KEY ("provinceId")
);

-- CreateIndex
CREATE UNIQUE INDEX "province_provinceId_key" ON "public"."province"("provinceId");

-- AddForeignKey
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "public"."province"("provinceId") ON DELETE SET NULL ON UPDATE CASCADE;
