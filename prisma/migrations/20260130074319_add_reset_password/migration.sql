/*
  Warnings:

  - You are about to drop the `resetpass` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."resetpass" DROP CONSTRAINT "resetpass_ibfk_1";

-- DropForeignKey
ALTER TABLE "public"."resetpass" DROP CONSTRAINT "resetpass_ibfk_2";

-- DropTable
DROP TABLE "public"."resetpass";

-- CreateTable
CREATE TABLE "public"."reset_tokens" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expiration_time" TIMESTAMPTZ NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" VARCHAR(255) NOT NULL,
    "userId" INTEGER,
    "adminId" INTEGER,

    CONSTRAINT "reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reset_tokens_token_key" ON "public"."reset_tokens"("token");

-- AddForeignKey
ALTER TABLE "public"."reset_tokens" ADD CONSTRAINT "reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reset_tokens" ADD CONSTRAINT "reset_tokens_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
