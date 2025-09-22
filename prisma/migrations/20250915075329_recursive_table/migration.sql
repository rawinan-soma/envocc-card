/*
  Warnings:

  - You are about to drop the column `level` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `position_lv` on the `admins` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `envocc_card_files` table. All the data in the column will be lost.
  - You are about to drop the column `institution` on the `epositions` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `exp_files` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `experiences` table. All the data in the column will be lost.
  - You are about to drop the column `admin` on the `experiences_files` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `gov_card_files` table. All the data in the column will be lost.
  - You are about to drop the column `signer` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `members` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `photos` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `request_files` table. All the data in the column will be lost.
  - The primary key for the `requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `req_id` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `user` on the `requests` table. All the data in the column will be lost.
  - You are about to drop the column `eposition` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `position_lv` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `access_levels` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `adminDep` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `adminInst` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `adminMinis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `institutions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ministries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sign_persons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `userDep` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `userInst` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[id]` on the table `requests` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `positionId` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `positionLvId` to the `admins` table without a default value. This is not possible if the table is not empty.
  - Added the required column `institutionId` to the `epositions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `members` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `requests` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."OrgLevel" AS ENUM ('MINISTRY', 'DEPARTMENT', 'REGION', 'PROVINCE', 'UNIT');

-- DropForeignKey
ALTER TABLE "public"."adminDep" DROP CONSTRAINT "adminDep_admin_fkey";

-- DropForeignKey
ALTER TABLE "public"."adminDep" DROP CONSTRAINT "adminDep_department_fkey";

-- DropForeignKey
ALTER TABLE "public"."adminInst" DROP CONSTRAINT "adminInst_admin_fkey";

-- DropForeignKey
ALTER TABLE "public"."adminInst" DROP CONSTRAINT "adminInst_institution_fkey";

-- DropForeignKey
ALTER TABLE "public"."adminMinis" DROP CONSTRAINT "adminMinis_admin_fkey";

-- DropForeignKey
ALTER TABLE "public"."adminMinis" DROP CONSTRAINT "adminMinis_ministry_fkey";

-- DropForeignKey
ALTER TABLE "public"."admins" DROP CONSTRAINT "admins_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."admins" DROP CONSTRAINT "admins_position_fkey";

-- DropForeignKey
ALTER TABLE "public"."admins" DROP CONSTRAINT "admins_position_lv_fkey";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_seal_fkey";

-- DropForeignKey
ALTER TABLE "public"."envocc_card_files" DROP CONSTRAINT "envocc_card_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."epositions" DROP CONSTRAINT "epositions_institution_fkey";

-- DropForeignKey
ALTER TABLE "public"."exp_files" DROP CONSTRAINT "exp_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."experiences" DROP CONSTRAINT "experience_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."experiences_files" DROP CONSTRAINT "experiences_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."gov_card_files" DROP CONSTRAINT "gov_card_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."institutions" DROP CONSTRAINT "institutions_department_fkey";

-- DropForeignKey
ALTER TABLE "public"."members" DROP CONSTRAINT "members_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."members" DROP CONSTRAINT "members_signer_fkey";

-- DropForeignKey
ALTER TABLE "public"."photos" DROP CONSTRAINT "photos_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."request_files" DROP CONSTRAINT "request_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."requests" DROP CONSTRAINT "requests_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."sign_persons" DROP CONSTRAINT "sign_persons_departmentsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."userDep" DROP CONSTRAINT "userDep_department_fkey";

-- DropForeignKey
ALTER TABLE "public"."userDep" DROP CONSTRAINT "userDep_user_fkey";

-- DropForeignKey
ALTER TABLE "public"."userInst" DROP CONSTRAINT "userInst_institution_fkey";

-- DropForeignKey
ALTER TABLE "public"."userInst" DROP CONSTRAINT "userInst_user_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_eposition_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_position_fkey";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_position_lv_fkey";

-- DropIndex
DROP INDEX "public"."level";

-- DropIndex
DROP INDEX "public"."envocc_card_files_user_idx";

-- DropIndex
DROP INDEX "public"."exp_files_user_idx";

-- DropIndex
DROP INDEX "public"."experiences_user_idx";

-- DropIndex
DROP INDEX "public"."admin";

-- DropIndex
DROP INDEX "public"."gov_card_files_user_idx";

-- DropIndex
DROP INDEX "public"."photos_user_idx";

-- DropIndex
DROP INDEX "public"."request_files_user_idx";

-- DropIndex
DROP INDEX "public"."req_id";

-- DropIndex
DROP INDEX "public"."requests_user_idx";

-- AlterTable
ALTER TABLE "public"."admins" DROP COLUMN "level",
DROP COLUMN "position",
DROP COLUMN "position_lv",
ADD COLUMN     "positionId" INTEGER NOT NULL,
ADD COLUMN     "positionLvId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."envocc_card_files" DROP COLUMN "user",
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "public"."epositions" DROP COLUMN "institution",
ADD COLUMN     "institutionId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."exp_files" DROP COLUMN "user",
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "public"."experiences" DROP COLUMN "user",
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "public"."experiences_files" DROP COLUMN "admin",
ADD COLUMN     "adminId" INTEGER;

-- AlterTable
ALTER TABLE "public"."gov_card_files" DROP COLUMN "user",
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "public"."members" DROP COLUMN "signer",
DROP COLUMN "user",
ADD COLUMN     "signatureId" INTEGER,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."photos" DROP COLUMN "user",
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "public"."request_files" DROP COLUMN "user",
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "public"."requests" DROP CONSTRAINT "requests_pkey",
DROP COLUMN "req_id",
DROP COLUMN "user",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "eposition",
DROP COLUMN "position",
DROP COLUMN "position_lv",
ADD COLUMN     "epositionId" INTEGER,
ADD COLUMN     "positionId" INTEGER,
ADD COLUMN     "position_lvId" INTEGER;

-- DropTable
DROP TABLE "public"."access_levels";

-- DropTable
DROP TABLE "public"."adminDep";

-- DropTable
DROP TABLE "public"."adminInst";

-- DropTable
DROP TABLE "public"."adminMinis";

-- DropTable
DROP TABLE "public"."departments";

-- DropTable
DROP TABLE "public"."institutions";

-- DropTable
DROP TABLE "public"."ministries";

-- DropTable
DROP TABLE "public"."sign_persons";

-- DropTable
DROP TABLE "public"."userDep";

-- DropTable
DROP TABLE "public"."userInst";

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name_th" TEXT NOT NULL,
    "name_eng" TEXT NOT NULL,
    "level" "public"."OrgLevel" NOT NULL,
    "parentId" INTEGER,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orgOnProvince" (
    "orgId" INTEGER NOT NULL,
    "province" INTEGER NOT NULL,
    "region" INTEGER NOT NULL,

    CONSTRAINT "orgOnProvince_pkey" PRIMARY KEY ("orgId","region","province")
);

-- CreateTable
CREATE TABLE "public"."orgOnSeal" (
    "orgId" INTEGER NOT NULL,
    "sealId" INTEGER NOT NULL,

    CONSTRAINT "orgOnSeal_pkey" PRIMARY KEY ("orgId","sealId")
);

-- CreateTable
CREATE TABLE "public"."orgOnSignature" (
    "orgId" INTEGER NOT NULL,
    "signatureId" INTEGER NOT NULL,

    CONSTRAINT "orgOnSignature_pkey" PRIMARY KEY ("orgId","signatureId")
);

-- CreateTable
CREATE TABLE "public"."adminOnOrg" (
    "adminId" INTEGER NOT NULL,
    "orgId" INTEGER NOT NULL,

    CONSTRAINT "adminOnOrg_pkey" PRIMARY KEY ("adminId","orgId")
);

-- CreateTable
CREATE TABLE "public"."userOnOrg" (
    "userId" INTEGER NOT NULL,
    "orgId" INTEGER NOT NULL,

    CONSTRAINT "userOnOrg_pkey" PRIMARY KEY ("userId","orgId")
);

-- CreateTable
CREATE TABLE "public"."signatures" (
    "id" SERIAL NOT NULL,
    "sign_person_pname" VARCHAR(100) NOT NULL,
    "sign_person_name" VARCHAR(255) NOT NULL,
    "sign_person_lname" VARCHAR(255) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "url" TEXT,
    "position" VARCHAR(255) NOT NULL,
    "sign_person_active" BOOLEAN NOT NULL DEFAULT true,
    "create_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "admin" INTEGER NOT NULL,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_id_key" ON "public"."organizations"("id");

-- CreateIndex
CREATE UNIQUE INDEX "orgOnProvince_orgId_key" ON "public"."orgOnProvince"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "sign_person_id" ON "public"."signatures"("id");

-- CreateIndex
CREATE UNIQUE INDEX "signatures_filename_key" ON "public"."signatures"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "req_id" ON "public"."requests"("id");

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."positions"("position_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_positionLvId_fkey" FOREIGN KEY ("positionLvId") REFERENCES "public"."position_lvs"("position_lv_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orgOnProvince" ADD CONSTRAINT "orgOnProvince_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orgOnSeal" ADD CONSTRAINT "orgOnSeal_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orgOnSeal" ADD CONSTRAINT "orgOnSeal_sealId_fkey" FOREIGN KEY ("sealId") REFERENCES "public"."seals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orgOnSignature" ADD CONSTRAINT "orgOnSignature_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orgOnSignature" ADD CONSTRAINT "orgOnSignature_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "public"."signatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."adminOnOrg" ADD CONSTRAINT "adminOnOrg_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."adminOnOrg" ADD CONSTRAINT "adminOnOrg_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userOnOrg" ADD CONSTRAINT "userOnOrg_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userOnOrg" ADD CONSTRAINT "userOnOrg_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."envocc_card_files" ADD CONSTRAINT "envocc_card_files_ibfk_1" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."epositions" ADD CONSTRAINT "epositions_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exp_files" ADD CONSTRAINT "exp_files_ibfk_1" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiences" ADD CONSTRAINT "experience_ibfk_1" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiences_files" ADD CONSTRAINT "experiences_files_ibfk_1" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."gov_card_files" ADD CONSTRAINT "gov_card_files_ibfk_1" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_ibfk_1" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_signatureId_fkey" FOREIGN KEY ("signatureId") REFERENCES "public"."signatures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photos" ADD CONSTRAINT "photos_ibfk_1" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_files" ADD CONSTRAINT "request_files_ibfk_1" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_ibfk_1" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_epositionId_fkey" FOREIGN KEY ("epositionId") REFERENCES "public"."epositions"("eposition_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "public"."positions"("position_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_position_lvId_fkey" FOREIGN KEY ("position_lvId") REFERENCES "public"."position_lvs"("position_lv_id") ON DELETE SET NULL ON UPDATE CASCADE;
