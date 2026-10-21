/*
  Users now upload their own government card and experience form, so these
  rows can have no admin. request_files stays admin-only.
*/
-- AlterTable
ALTER TABLE "public"."gov_card_files" ALTER COLUMN "adminId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."exp_files" ALTER COLUMN "adminId" DROP NOT NULL;
