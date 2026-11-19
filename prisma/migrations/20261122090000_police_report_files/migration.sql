/*
  A lost-card request (Request Type 3) needs a police report, sent with
  Document upload by the user or by an admin for them.
*/
-- CreateTable
CREATE TABLE "public"."police_report_files" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "filename" VARCHAR(255),
    "url" TEXT,
    "create_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "police_report_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "police_report_files_filename_key" ON "public"."police_report_files"("filename");

-- AddForeignKey
ALTER TABLE "public"."police_report_files" ADD CONSTRAINT "police_report_files_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "public"."admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."police_report_files" ADD CONSTRAINT "police_report_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
