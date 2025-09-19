/*
  Warnings:

  - The primary key for the `orgOnProvince` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `orgId` on the `orgOnProvince` table. All the data in the column will be lost.
  - You are about to drop the column `province` on the `orgOnProvince` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `orgOnProvince` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `seals` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[provinceId]` on the table `orgOnProvince` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `health_region` to the `orgOnProvince` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_eng` to the `orgOnProvince` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_th` to the `orgOnProvince` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provinceId` to the `orgOnProvince` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `seals` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."orgOnProvince" DROP CONSTRAINT "orgOnProvince_orgId_fkey";

-- DropIndex
DROP INDEX "public"."orgOnProvince_orgId_key";

-- AlterTable
ALTER TABLE "public"."orgOnProvince" DROP CONSTRAINT "orgOnProvince_pkey",
DROP COLUMN "orgId",
DROP COLUMN "province",
DROP COLUMN "region",
ADD COLUMN     "health_region" INTEGER NOT NULL,
ADD COLUMN     "name_eng" TEXT NOT NULL,
ADD COLUMN     "name_th" TEXT NOT NULL,
ADD COLUMN     "provinceId" INTEGER NOT NULL,
ADD CONSTRAINT "orgOnProvince_pkey" PRIMARY KEY ("provinceId");

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "provinceId" INTEGER;

-- AlterTable
ALTER TABLE "public"."seals" DROP COLUMN "user",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orgOnProvince_provinceId_key" ON "public"."orgOnProvince"("provinceId");

-- AddForeignKey
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "public"."orgOnProvince"("provinceId") ON DELETE SET NULL ON UPDATE CASCADE;
