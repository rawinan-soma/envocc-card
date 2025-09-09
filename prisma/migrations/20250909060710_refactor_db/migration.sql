/*
  Warnings:

  - You are about to drop the column `institution` on the `admins` table. All the data in the column will be lost.
  - The primary key for the `departments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `department_id` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `department_name_eng` on the `departments` table. All the data in the column will be lost.
  - You are about to drop the column `department_name_th` on the `departments` table. All the data in the column will be lost.
  - The primary key for the `institutions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `institution_code` on the `institutions` table. All the data in the column will be lost.
  - You are about to drop the column `institution_id` on the `institutions` table. All the data in the column will be lost.
  - You are about to drop the column `institution_name_eng` on the `institutions` table. All the data in the column will be lost.
  - You are about to drop the column `institution_name_th` on the `institutions` table. All the data in the column will be lost.
  - The primary key for the `ministries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `ministry_id` on the `ministries` table. All the data in the column will be lost.
  - You are about to drop the column `ministry_name_eng` on the `ministries` table. All the data in the column will be lost.
  - You are about to drop the column `ministry_name_th` on the `ministries` table. All the data in the column will be lost.
  - You are about to drop the column `eposition` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `institution` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `position_lv` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `institutions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `ministries` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_eng` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_th` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sealsId` to the `departments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `institutions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_eng` to the `institutions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_th` to the `institutions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `ministries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_eng` to the `ministries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_th` to the `ministries` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."admins" DROP CONSTRAINT "admins_ibfk_2";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."epositions" DROP CONSTRAINT "epositions_institution_fkey";

-- DropForeignKey
ALTER TABLE "public"."institutions" DROP CONSTRAINT "institutions_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."institutions" DROP CONSTRAINT "institutions_seal_fkey";

-- DropForeignKey
ALTER TABLE "public"."institutions" DROP CONSTRAINT "institutions_sign_person_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_eposition_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_position_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_position_lv_fkey";

-- DropIndex
DROP INDEX "public"."admins_institution_idx";

-- DropIndex
DROP INDEX "public"."department_id";

-- DropIndex
DROP INDEX "public"."institution_id";

-- DropIndex
DROP INDEX "public"."ministry_id";

-- DropIndex
DROP INDEX "public"."institution";

-- AlterTable
ALTER TABLE "public"."admins" DROP COLUMN "institution";

-- AlterTable
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_pkey",
DROP COLUMN "department_id",
DROP COLUMN "department_name_eng",
DROP COLUMN "department_name_th",
ADD COLUMN     "id" INTEGER NOT NULL,
ADD COLUMN     "name_eng" VARCHAR(255) NOT NULL,
ADD COLUMN     "name_th" VARCHAR(255) NOT NULL,
ADD COLUMN     "sealsId" INTEGER NOT NULL,
ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."institutions" DROP CONSTRAINT "institutions_pkey",
DROP COLUMN "institution_code",
DROP COLUMN "institution_id",
DROP COLUMN "institution_name_eng",
DROP COLUMN "institution_name_th",
ADD COLUMN     "code" VARCHAR(10) NOT NULL,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "name_eng" VARCHAR(255) NOT NULL,
ADD COLUMN     "name_th" VARCHAR(255) NOT NULL,
ADD CONSTRAINT "institutions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."ministries" DROP CONSTRAINT "ministries_pkey",
DROP COLUMN "ministry_id",
DROP COLUMN "ministry_name_eng",
DROP COLUMN "ministry_name_th",
ADD COLUMN     "id" INTEGER NOT NULL,
ADD COLUMN     "name_eng" VARCHAR(255) NOT NULL,
ADD COLUMN     "name_th" VARCHAR(255) NOT NULL,
ADD CONSTRAINT "ministries_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."sign_persons" ADD COLUMN     "departmentsId" INTEGER;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "eposition",
DROP COLUMN "institution",
DROP COLUMN "position",
DROP COLUMN "position_lv",
ADD COLUMN     "epositionsEposition_id" INTEGER,
ADD COLUMN     "position_lvsPosition_lv_id" INTEGER,
ADD COLUMN     "positionsPosition_id" INTEGER;

-- CreateTable
CREATE TABLE "public"."adminDep" (
    "admin" INTEGER NOT NULL,
    "department" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "public"."adminInst" (
    "admin" INTEGER NOT NULL,
    "institution" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "public"."adminMinis" (
    "admin" INTEGER NOT NULL,
    "ministry" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "public"."userInst" (
    "user" INTEGER NOT NULL,
    "institution" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "public"."userDep" (
    "user" INTEGER NOT NULL,
    "department" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "adminDep_admin_key" ON "public"."adminDep"("admin");

-- CreateIndex
CREATE UNIQUE INDEX "adminInst_admin_key" ON "public"."adminInst"("admin");

-- CreateIndex
CREATE UNIQUE INDEX "adminMinis_admin_key" ON "public"."adminMinis"("admin");

-- CreateIndex
CREATE UNIQUE INDEX "userInst_user_key" ON "public"."userInst"("user");

-- CreateIndex
CREATE UNIQUE INDEX "userDep_user_key" ON "public"."userDep"("user");

-- CreateIndex
CREATE UNIQUE INDEX "department_id" ON "public"."departments"("id");

-- CreateIndex
CREATE UNIQUE INDEX "institution_id" ON "public"."institutions"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ministry_id" ON "public"."ministries"("id");

-- AddForeignKey
ALTER TABLE "public"."adminDep" ADD CONSTRAINT "adminDep_admin_fkey" FOREIGN KEY ("admin") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."adminDep" ADD CONSTRAINT "adminDep_department_fkey" FOREIGN KEY ("department") REFERENCES "public"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."adminInst" ADD CONSTRAINT "adminInst_admin_fkey" FOREIGN KEY ("admin") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."adminInst" ADD CONSTRAINT "adminInst_institution_fkey" FOREIGN KEY ("institution") REFERENCES "public"."institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."adminMinis" ADD CONSTRAINT "adminMinis_admin_fkey" FOREIGN KEY ("admin") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."adminMinis" ADD CONSTRAINT "adminMinis_ministry_fkey" FOREIGN KEY ("ministry") REFERENCES "public"."ministries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_ibfk_1" FOREIGN KEY ("ministry") REFERENCES "public"."ministries"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_sealsId_fkey" FOREIGN KEY ("sealsId") REFERENCES "public"."seals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."epositions" ADD CONSTRAINT "epositions_institution_fkey" FOREIGN KEY ("institution") REFERENCES "public"."institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."institutions" ADD CONSTRAINT "institutions_ibfk_1" FOREIGN KEY ("department") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."sign_persons" ADD CONSTRAINT "sign_persons_departmentsId_fkey" FOREIGN KEY ("departmentsId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_epositionsEposition_id_fkey" FOREIGN KEY ("epositionsEposition_id") REFERENCES "public"."epositions"("eposition_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_positionsPosition_id_fkey" FOREIGN KEY ("positionsPosition_id") REFERENCES "public"."positions"("position_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_position_lvsPosition_lv_id_fkey" FOREIGN KEY ("position_lvsPosition_lv_id") REFERENCES "public"."position_lvs"("position_lv_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userInst" ADD CONSTRAINT "userInst_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userInst" ADD CONSTRAINT "userInst_institution_fkey" FOREIGN KEY ("institution") REFERENCES "public"."institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userDep" ADD CONSTRAINT "userDep_user_fkey" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userDep" ADD CONSTRAINT "userDep_department_fkey" FOREIGN KEY ("department") REFERENCES "public"."departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
