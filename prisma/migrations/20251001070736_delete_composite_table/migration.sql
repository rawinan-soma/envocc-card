/*
  Warnings:

  - You are about to drop the `adminOnOrg` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orgOnSeal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `orgOnSignature` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `userOnOrg` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `organizationId` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sealId` to the `organizations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signatureId` to the `organizations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."adminOnOrg" DROP CONSTRAINT "adminOnOrg_adminId_fkey";

-- DropForeignKey
ALTER TABLE "public"."adminOnOrg" DROP CONSTRAINT "adminOnOrg_orgId_fkey";

-- DropForeignKey
ALTER TABLE "public"."orgOnSeal" DROP CONSTRAINT "orgOnSeal_orgId_fkey";

-- DropForeignKey
ALTER TABLE "public"."orgOnSeal" DROP CONSTRAINT "orgOnSeal_sealId_fkey";

-- DropForeignKey
ALTER TABLE "public"."orgOnSignature" DROP CONSTRAINT "orgOnSignature_orgId_fkey";

-- DropForeignKey
ALTER TABLE "public"."orgOnSignature" DROP CONSTRAINT "orgOnSignature_signatureId_fkey";

-- DropForeignKey
ALTER TABLE "public"."userOnOrg" DROP CONSTRAINT "userOnOrg_orgId_fkey";

-- DropForeignKey
ALTER TABLE "public"."userOnOrg" DROP CONSTRAINT "userOnOrg_userId_fkey";

-- AlterTable
ALTER TABLE "public"."admins" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."organizations" ADD COLUMN     "sealId" INTEGER NOT NULL,
ADD COLUMN     "signatureId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "organizationId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "public"."adminOnOrg";

-- DropTable
DROP TABLE "public"."orgOnSeal";

-- DropTable
DROP TABLE "public"."orgOnSignature";

-- DropTable
DROP TABLE "public"."userOnOrg";

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_sealId_fkey" FOREIGN KEY ("sealId") REFERENCES "public"."seals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "public"."signatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
