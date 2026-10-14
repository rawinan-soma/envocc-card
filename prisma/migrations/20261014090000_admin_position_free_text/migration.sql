/*
  admins."positionId" was an INTEGER foreign key to positions; it is now free
  text (fe651c0). Production still holds integer ids, so each one becomes its
  position's name, or the id as text if that position has no name.
*/
-- DropForeignKey
ALTER TABLE "public"."admins" DROP CONSTRAINT "admins_positionId_fkey";

-- AlterTable
ALTER TABLE "public"."admins" ALTER COLUMN "positionId" SET DATA TYPE TEXT USING "positionId"::TEXT;

-- Backfill
UPDATE "public"."admins" AS a
SET "positionId" = p."position_name"
FROM "public"."positions" AS p
WHERE a."positionId" = p."position_id"::TEXT
  AND p."position_name" IS NOT NULL;
