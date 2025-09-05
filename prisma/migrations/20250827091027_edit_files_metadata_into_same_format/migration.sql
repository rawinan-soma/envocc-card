/*
  Warnings:

  - The primary key for the `documents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `doc_file` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `doc_id` on the `documents` table. All the data in the column will be lost.
  - The primary key for the `envocc_card_files` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `envocc_card_file_id` on the `envocc_card_files` table. All the data in the column will be lost.
  - You are about to drop the column `file_card_name` on the `envocc_card_files` table. All the data in the column will be lost.
  - The primary key for the `exp_files` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `exp_file_id` on the `exp_files` table. All the data in the column will be lost.
  - You are about to drop the column `file_name` on the `exp_files` table. All the data in the column will be lost.
  - The primary key for the `gov_card_files` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `file_name` on the `gov_card_files` table. All the data in the column will be lost.
  - You are about to drop the column `gov_card_file_id` on the `gov_card_files` table. All the data in the column will be lost.
  - The primary key for the `photos` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `photo` on the `photos` table. All the data in the column will be lost.
  - You are about to drop the column `photo_id` on the `photos` table. All the data in the column will be lost.
  - The primary key for the `request_files` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `file_name` on the `request_files` table. All the data in the column will be lost.
  - You are about to drop the column `request_file_id` on the `request_files` table. All the data in the column will be lost.
  - The primary key for the `seals` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `add_date` on the `seals` table. All the data in the column will be lost.
  - You are about to drop the column `seal_id` on the `seals` table. All the data in the column will be lost.
  - You are about to drop the column `seal_pix` on the `seals` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `documents` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `envocc_card_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[filename]` on the table `envocc_card_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `exp_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[filename]` on the table `exp_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `gov_card_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[filename]` on the table `gov_card_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `photos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[filename]` on the table `photos` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `request_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[filename]` on the table `request_files` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `seals` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[filename]` on the table `seals` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."institutions" DROP CONSTRAINT "institutions_seal_fkey";

-- DropIndex
DROP INDEX "public"."doc_id";

-- DropIndex
DROP INDEX "public"."envocc_card_file_id";

-- DropIndex
DROP INDEX "public"."envocc_card_files_file_card_name_key";

-- DropIndex
DROP INDEX "public"."exp_file_id";

-- DropIndex
DROP INDEX "public"."exp_files_file_name_key";

-- DropIndex
DROP INDEX "public"."gov_card_file_id";

-- DropIndex
DROP INDEX "public"."gov_card_files_file_name_key";

-- DropIndex
DROP INDEX "public"."photo_id";

-- DropIndex
DROP INDEX "public"."photos_photo_key";

-- DropIndex
DROP INDEX "public"."request_file_id";

-- DropIndex
DROP INDEX "public"."request_files_file_name_key";

-- DropIndex
DROP INDEX "public"."seal_id";

-- DropIndex
DROP INDEX "public"."seals_seal_pix_key";

-- AlterTable
ALTER TABLE "public"."documents" DROP CONSTRAINT "documents_pkey",
DROP COLUMN "doc_file",
DROP COLUMN "doc_id",
ADD COLUMN     "filename" TEXT,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."envocc_card_files" DROP CONSTRAINT "envocc_card_files_pkey",
DROP COLUMN "envocc_card_file_id",
DROP COLUMN "file_card_name",
ADD COLUMN     "filename" VARCHAR(255),
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "envocc_card_files_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."exp_files" DROP CONSTRAINT "exp_files_pkey",
DROP COLUMN "exp_file_id",
DROP COLUMN "file_name",
ADD COLUMN     "filename" VARCHAR(255),
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "exp_files_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."gov_card_files" DROP CONSTRAINT "gov_card_files_pkey",
DROP COLUMN "file_name",
DROP COLUMN "gov_card_file_id",
ADD COLUMN     "filename" VARCHAR(255),
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "gov_card_files_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."photos" DROP CONSTRAINT "photos_pkey",
DROP COLUMN "photo",
DROP COLUMN "photo_id",
ADD COLUMN     "filename" VARCHAR(255),
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "photos_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."request_files" DROP CONSTRAINT "request_files_pkey",
DROP COLUMN "file_name",
DROP COLUMN "request_file_id",
ADD COLUMN     "filename" VARCHAR(255),
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "request_files_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."seals" DROP CONSTRAINT "seals_pkey",
DROP COLUMN "add_date",
DROP COLUMN "seal_id",
DROP COLUMN "seal_pix",
ADD COLUMN     "create_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "filename" VARCHAR(255),
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "seals_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_id_key" ON "public"."documents"("id");

-- CreateIndex
CREATE UNIQUE INDEX "envocc_card_files_id_key" ON "public"."envocc_card_files"("id");

-- CreateIndex
CREATE UNIQUE INDEX "envocc_card_files_filename_key" ON "public"."envocc_card_files"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "exp_files_id_key" ON "public"."exp_files"("id");

-- CreateIndex
CREATE UNIQUE INDEX "exp_files_filename_key" ON "public"."exp_files"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "gov_card_file_id" ON "public"."gov_card_files"("id");

-- CreateIndex
CREATE UNIQUE INDEX "gov_card_files_filename_key" ON "public"."gov_card_files"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "photo_id" ON "public"."photos"("id");

-- CreateIndex
CREATE UNIQUE INDEX "photos_filename_key" ON "public"."photos"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "request_file_id" ON "public"."request_files"("id");

-- CreateIndex
CREATE UNIQUE INDEX "request_files_filename_key" ON "public"."request_files"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "seal_id" ON "public"."seals"("id");

-- CreateIndex
CREATE UNIQUE INDEX "seals_filename_key" ON "public"."seals"("filename");

-- AddForeignKey
ALTER TABLE "public"."institutions" ADD CONSTRAINT "institutions_seal_fkey" FOREIGN KEY ("seal") REFERENCES "public"."seals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
