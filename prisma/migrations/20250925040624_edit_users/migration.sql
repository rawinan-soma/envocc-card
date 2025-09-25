/*
  Warnings:

  - You are about to drop the column `approve` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `e_learning` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "approve",
DROP COLUMN "e_learning";
