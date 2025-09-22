-- AlterTable
ALTER TABLE "public"."positions" ADD COLUMN     "orgId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."positions" ADD CONSTRAINT "positions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
