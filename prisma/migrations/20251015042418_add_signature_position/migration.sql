/*
  Warnings:

  - Added the required column `sign_person_position` to the `signatures` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."signatures" ADD COLUMN     "sign_person_position" TEXT NOT NULL;
