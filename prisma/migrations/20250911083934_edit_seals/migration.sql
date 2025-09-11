/*
  Warnings:

  - You are about to drop the column `sealsId` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `seal` on the `institutions` table. All the data in the column will be lost.
  - You are about to drop the column `sign_person` on the `institutions` table. All the data in the column will be lost.
  - You are about to drop the column `epositionsEposition_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `position_lvsPosition_lv_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `positionsPosition_id` on the `users` table. All the data in the column will be lost.
  - Added the required column `seal` to the `departments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_sealsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."institutions" DROP CONSTRAINT "institutions_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_epositionsEposition_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_position_lvsPosition_lv_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_positionsPosition_id_fkey";

-- DropIndex
DROP INDEX "public"."department";

-- AlterTable
ALTER TABLE "public"."departments" DROP COLUMN "sealsId",
ADD COLUMN     "seal" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."institutions" DROP COLUMN "seal",
DROP COLUMN "sign_person";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "epositionsEposition_id",
DROP COLUMN "position_lvsPosition_lv_id",
DROP COLUMN "positionsPosition_id",
ADD COLUMN     "eposition" INTEGER,
ADD COLUMN     "position" INTEGER,
ADD COLUMN     "position_lv" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_seal_fkey" FOREIGN KEY ("seal") REFERENCES "public"."seals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."institutions" ADD CONSTRAINT "institutions_department_fkey" FOREIGN KEY ("department") REFERENCES "public"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_eposition_fkey" FOREIGN KEY ("eposition") REFERENCES "public"."epositions"("eposition_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_position_fkey" FOREIGN KEY ("position") REFERENCES "public"."positions"("position_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_position_lv_fkey" FOREIGN KEY ("position_lv") REFERENCES "public"."position_lvs"("position_lv_id") ON DELETE SET NULL ON UPDATE CASCADE;
