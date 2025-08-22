/*
  Warnings:

  - You are about to drop the column `department_seal` on the `departments` table. All the data in the column will be lost.
  - The primary key for the `members` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `department` on the `sign_persons` table. All the data in the column will be lost.
  - You are about to drop the column `sing_person_active` on the `sign_persons` table. All the data in the column will be lost.
  - You are about to drop the column `sing_person_pname` on the `sign_persons` table. All the data in the column will be lost.
  - You are about to drop the column `districts1` on the `users` table. All the data in the column will be lost.
  - The `moo2` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[doc_name]` on the table `documents` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[file_card_name]` on the table `envocc_card_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[file_name]` on the table `exp_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[exp_file]` on the table `experiences_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[file_name]` on the table `gov_card_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[photo]` on the table `photos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[file_name]` on the table `request_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[seal_pix]` on the table `seals` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[signature_pix]` on the table `sign_persons` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `seal` to the `institutions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sign_person` to the `institutions` table without a default value. This is not possible if the table is not empty.
  - Made the column `user` on table `requests` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `seal_name` to the `seals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `update_admin` to the `seals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sign_person_pname` to the `sign_persons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `update_admin` to the `sign_persons` table without a default value. This is not possible if the table is not empty.
  - Made the column `sign_person_name` on table `sign_persons` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sign_person_lname` on table `sign_persons` required. This step will fail if there are existing NULL values in that column.
  - Made the column `signature_pix` on table `sign_persons` required. This step will fail if there are existing NULL values in that column.
  - Made the column `position` on table `sign_persons` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `district1` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."admins" DROP CONSTRAINT "admins_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."admins" DROP CONSTRAINT "admins_ibfk_2";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."departments" DROP CONSTRAINT "departments_ibfk_2";

-- DropForeignKey
ALTER TABLE "public"."envocc_card_files" DROP CONSTRAINT "envocc_card_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."exp_files" DROP CONSTRAINT "exp_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."experiences" DROP CONSTRAINT "experience_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."experiences_files" DROP CONSTRAINT "experiences_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."gov_card_files" DROP CONSTRAINT "gov_card_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."institutions" DROP CONSTRAINT "institutions_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."members" DROP CONSTRAINT "members_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."photos" DROP CONSTRAINT "photos_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."request_files" DROP CONSTRAINT "request_files_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."requests" DROP CONSTRAINT "requests_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."requests" DROP CONSTRAINT "requests_ibfk_2";

-- DropForeignKey
ALTER TABLE "public"."requests" DROP CONSTRAINT "requests_ibfk_3";

-- DropForeignKey
ALTER TABLE "public"."resetpass" DROP CONSTRAINT "resetpass_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."resetpass" DROP CONSTRAINT "resetpass_ibfk_2";

-- DropForeignKey
ALTER TABLE "public"."sign_persons" DROP CONSTRAINT "sign_persons_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_ibfk_1";

-- DropIndex
DROP INDEX "public"."department_seal";

-- DropIndex
DROP INDEX "public"."members_user_key";

-- DropIndex
DROP INDEX "public"."department";

-- AlterTable
ALTER TABLE "public"."admins" ADD COLUMN     "is_validate" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "hashedRefreshToken" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."departments" DROP COLUMN "department_seal";

-- AlterTable
ALTER TABLE "public"."documents" ADD COLUMN     "doc_file" TEXT,
ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "public"."envocc_card_files" ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "public"."exp_files" ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "public"."experiences" ADD COLUMN     "exp_years" INTEGER;

-- AlterTable
ALTER TABLE "public"."experiences_files" ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "public"."gov_card_files" ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "public"."institutions" ADD COLUMN     "seal" INTEGER NOT NULL,
ADD COLUMN     "sign_person" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."members" DROP CONSTRAINT "members_pkey",
ADD COLUMN     "create_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "start_date" DROP NOT NULL,
ALTER COLUMN "end_date" DROP NOT NULL,
ALTER COLUMN "qrcode" DROP NOT NULL,
ALTER COLUMN "qrcode_pass" DROP NOT NULL,
ALTER COLUMN "signer" DROP NOT NULL,
ADD CONSTRAINT "members_pkey" PRIMARY KEY ("member_id");

-- AlterTable
ALTER TABLE "public"."photos" ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "public"."request_files" ADD COLUMN     "url" TEXT;

-- AlterTable
ALTER TABLE "public"."requests" DROP CONSTRAINT "requests_pkey",
ALTER COLUMN "user" SET NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("req_id");

-- AlterTable
CREATE SEQUENCE "public".seals_seal_id_seq;
ALTER TABLE "public"."seals" ADD COLUMN     "add_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "seal_name" TEXT NOT NULL,
ADD COLUMN     "update_admin" INTEGER NOT NULL,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "seal_id" SET DEFAULT nextval('"public".seals_seal_id_seq');
ALTER SEQUENCE "public".seals_seal_id_seq OWNED BY "public"."seals"."seal_id";

-- AlterTable
CREATE SEQUENCE "public".sign_persons_sign_person_id_seq;
ALTER TABLE "public"."sign_persons" DROP COLUMN "department",
DROP COLUMN "sing_person_active",
DROP COLUMN "sing_person_pname",
ADD COLUMN     "date_update" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sign_person_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sign_person_pname" VARCHAR(100) NOT NULL,
ADD COLUMN     "update_admin" INTEGER NOT NULL,
ADD COLUMN     "url" TEXT,
ALTER COLUMN "sign_person_id" SET DEFAULT nextval('"public".sign_persons_sign_person_id_seq'),
ALTER COLUMN "sign_person_name" SET NOT NULL,
ALTER COLUMN "sign_person_lname" SET NOT NULL,
ALTER COLUMN "signature_pix" SET NOT NULL,
ALTER COLUMN "position" SET NOT NULL;
ALTER SEQUENCE "public".sign_persons_sign_person_id_seq OWNED BY "public"."sign_persons"."sign_person_id";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "districts1",
ADD COLUMN     "district1" INTEGER NOT NULL,
ALTER COLUMN "nationality" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "moo1" DROP NOT NULL,
ALTER COLUMN "alley1" DROP NOT NULL,
ALTER COLUMN "road1" DROP NOT NULL,
DROP COLUMN "moo2",
ADD COLUMN     "moo2" INTEGER,
ALTER COLUMN "alley2" DROP NOT NULL,
ALTER COLUMN "road2" DROP NOT NULL,
ALTER COLUMN "hashedRefreshToken" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "documents_doc_name_key" ON "public"."documents"("doc_name");

-- CreateIndex
CREATE UNIQUE INDEX "envocc_card_files_file_card_name_key" ON "public"."envocc_card_files"("file_card_name");

-- CreateIndex
CREATE UNIQUE INDEX "exp_files_file_name_key" ON "public"."exp_files"("file_name");

-- CreateIndex
CREATE UNIQUE INDEX "experiences_files_exp_file_key" ON "public"."experiences_files"("exp_file");

-- CreateIndex
CREATE UNIQUE INDEX "gov_card_files_file_name_key" ON "public"."gov_card_files"("file_name");

-- CreateIndex
CREATE UNIQUE INDEX "photos_photo_key" ON "public"."photos"("photo");

-- CreateIndex
CREATE UNIQUE INDEX "request_files_file_name_key" ON "public"."request_files"("file_name");

-- CreateIndex
CREATE UNIQUE INDEX "seals_seal_pix_key" ON "public"."seals"("seal_pix");

-- CreateIndex
CREATE UNIQUE INDEX "sign_persons_signature_pix_key" ON "public"."sign_persons"("signature_pix");

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_ibfk_1" FOREIGN KEY ("level") REFERENCES "public"."access_levels"("level_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_ibfk_2" FOREIGN KEY ("institution") REFERENCES "public"."institutions"("institution_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_ibfk_1" FOREIGN KEY ("ministry") REFERENCES "public"."ministries"("ministry_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."envocc_card_files" ADD CONSTRAINT "envocc_card_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."exp_files" ADD CONSTRAINT "exp_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiences" ADD CONSTRAINT "experience_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiences_files" ADD CONSTRAINT "experiences_files_ibfk_1" FOREIGN KEY ("admin") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."gov_card_files" ADD CONSTRAINT "gov_card_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."institutions" ADD CONSTRAINT "institutions_ibfk_1" FOREIGN KEY ("department") REFERENCES "public"."departments"("department_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."institutions" ADD CONSTRAINT "institutions_sign_person_fkey" FOREIGN KEY ("sign_person") REFERENCES "public"."sign_persons"("sign_person_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."institutions" ADD CONSTRAINT "institutions_seal_fkey" FOREIGN KEY ("seal") REFERENCES "public"."seals"("seal_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_signer_fkey" FOREIGN KEY ("signer") REFERENCES "public"."sign_persons"("sign_person_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."photos" ADD CONSTRAINT "photos_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_files" ADD CONSTRAINT "request_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_ibfk_2" FOREIGN KEY ("approver") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_ibfk_3" FOREIGN KEY ("request_status") REFERENCES "public"."request_statuses"("status_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."resetpass" ADD CONSTRAINT "resetpass_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."resetpass" ADD CONSTRAINT "resetpass_ibfk_2" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_ibfk_1" FOREIGN KEY ("institution") REFERENCES "public"."institutions"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."id" RENAME TO "admins_id_key";

-- RenameIndex
ALTER INDEX "public"."institutions_department_idx" RENAME TO "department";

-- RenameIndex
ALTER INDEX "public"."user" RENAME TO "resetpass_user_idx";

-- RenameIndex
ALTER INDEX "public"."users_id_key" RENAME TO "id";
