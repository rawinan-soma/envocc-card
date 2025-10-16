/*
  Warnings:

  - You are about to drop the column `userId` on the `seals` table. All the data in the column will be lost.
  - Added the required column `adminId` to the `exp_files` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `exp_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `adminId` on table `experiences_files` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `adminId` to the `gov_card_files` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `gov_card_files` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `request_files` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `adminId` to the `seals` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."exp_files" DROP CONSTRAINT "exp_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."experiences_files" DROP CONSTRAINT "experiences_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."gov_card_files" DROP CONSTRAINT "gov_card_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."request_files" DROP CONSTRAINT "request_files_ibfk_1";

-- AlterTable
ALTER TABLE "public"."exp_files" ADD COLUMN     "adminId" INTEGER NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."experiences_files" ALTER COLUMN "adminId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."gov_card_files" ADD COLUMN     "adminId" INTEGER NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."request_files" ADD COLUMN     "adminId" INTEGER,
ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."seals" DROP COLUMN "userId",
ADD COLUMN     "adminId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."exp_files" ADD CONSTRAINT "exp_files_ibfk_1" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."exp_files" ADD CONSTRAINT "exp_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."gov_card_files" ADD CONSTRAINT "gov_card_files_ibfk_1" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."gov_card_files" ADD CONSTRAINT "gov_card_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_files" ADD CONSTRAINT "request_files_ibfk_1" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_files" ADD CONSTRAINT "request_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
