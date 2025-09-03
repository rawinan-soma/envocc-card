/*
  Warnings:

  - You are about to drop the column `update_admin` on the `seals` table. All the data in the column will be lost.
  - The primary key for the `sign_persons` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `date_update` on the `sign_persons` table. All the data in the column will be lost.
  - You are about to drop the column `sign_person_id` on the `sign_persons` table. All the data in the column will be lost.
  - You are about to drop the column `signature_pix` on the `sign_persons` table. All the data in the column will be lost.
  - You are about to drop the column `update_admin` on the `sign_persons` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `sign_persons` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[filename]` on the table `sign_persons` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user` to the `seals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `admin` to the `sign_persons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `filename` to the `sign_persons` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."institutions" DROP CONSTRAINT "institutions_sign_person_fkey";

-- DropForeignKey
ALTER TABLE "public"."members" DROP CONSTRAINT "members_signer_fkey";

-- DropIndex
DROP INDEX "public"."sign_person_id";

-- DropIndex
DROP INDEX "public"."sign_persons_signature_pix_key";

-- AlterTable
ALTER TABLE "public"."seals" DROP COLUMN "update_admin",
ADD COLUMN     "user" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."sign_persons" DROP CONSTRAINT "sign_persons_pkey",
DROP COLUMN "date_update",
DROP COLUMN "sign_person_id",
DROP COLUMN "signature_pix",
DROP COLUMN "update_admin",
ADD COLUMN     "admin" INTEGER NOT NULL,
ADD COLUMN     "create_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "filename" VARCHAR(255) NOT NULL,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "sign_persons_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "sign_person_id" ON "public"."sign_persons"("id");

-- CreateIndex
CREATE UNIQUE INDEX "sign_persons_filename_key" ON "public"."sign_persons"("filename");

-- AddForeignKey
ALTER TABLE "public"."institutions" ADD CONSTRAINT "institutions_sign_person_fkey" FOREIGN KEY ("sign_person") REFERENCES "public"."sign_persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_signer_fkey" FOREIGN KEY ("signer") REFERENCES "public"."sign_persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
