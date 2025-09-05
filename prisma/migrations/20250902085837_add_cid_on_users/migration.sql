/*
  Warnings:

  - A unique constraint covering the columns `[cid]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cid` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "cid" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_cid_key" ON "public"."users"("cid");
