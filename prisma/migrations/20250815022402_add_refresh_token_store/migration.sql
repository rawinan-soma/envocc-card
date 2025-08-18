-- AlterTable
ALTER TABLE "public"."admins" ADD COLUMN     "hashedRefreshToken" VARCHAR;

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "hashedRefreshToken" VARCHAR;
