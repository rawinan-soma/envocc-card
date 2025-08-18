/*
  Warnings:

  - The primary key for the `admins` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `admin_id` on the `admins` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `user_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `admins` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
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
ALTER TABLE "public"."resetpass" DROP CONSTRAINT "resetpass_ibfk_1";

-- DropIndex
DROP INDEX "public"."admin_id";

-- DropIndex
DROP INDEX "public"."user_id";

-- AlterTable
ALTER TABLE "public"."admins" DROP CONSTRAINT "admins_pkey",
DROP COLUMN "admin_id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("username", "email", "id");

-- CreateIndex
CREATE UNIQUE INDEX "id" ON "public"."admins"("id");

-- CreateIndex
CREATE UNIQUE INDEX "users_id_key" ON "public"."users"("id");

-- AddForeignKey
ALTER TABLE "public"."envocc_card_files" ADD CONSTRAINT "envocc_card_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."exp_files" ADD CONSTRAINT "exp_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiences" ADD CONSTRAINT "experience_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiences_files" ADD CONSTRAINT "experiences_files_ibfk_1" FOREIGN KEY ("admin") REFERENCES "public"."admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."gov_card_files" ADD CONSTRAINT "gov_card_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."photos" ADD CONSTRAINT "photos_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_files" ADD CONSTRAINT "request_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_ibfk_2" FOREIGN KEY ("approver") REFERENCES "public"."admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."resetpass" ADD CONSTRAINT "resetpass_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
