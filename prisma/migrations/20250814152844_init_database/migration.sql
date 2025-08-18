-- CreateTable
CREATE TABLE "public"."access_levels" (
    "level_id" INTEGER NOT NULL,
    "validate_documents" INTEGER,
    "authorize_users" INTEGER,
    "add_card" INTEGER,
    "add_institution" INTEGER,
    "add_admin" INTEGER,
    "add_seal" INTEGER,
    "add_document" INTEGER,
    "data_institution" INTEGER,
    "data_province" INTEGER,
    "data_region" INTEGER,
    "data_nation" INTEGER,

    CONSTRAINT "access_levels_pkey" PRIMARY KEY ("level_id")
);

-- CreateTable
CREATE TABLE "public"."admins" (
    "admin_id" SERIAL NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "username" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "institution" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "pname" VARCHAR(255) NOT NULL,
    "fname" VARCHAR(255) NOT NULL,
    "lname" VARCHAR(255) NOT NULL,
    "private_number" VARCHAR(255) NOT NULL,
    "work_number" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "position" INTEGER NOT NULL,
    "position_lv" INTEGER NOT NULL,
    "create_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "public"."departments" (
    "department_id" INTEGER NOT NULL,
    "department_name_th" VARCHAR(255) NOT NULL,
    "department_name_eng" VARCHAR(255) NOT NULL,
    "ministry" INTEGER NOT NULL,
    "department_seal" INTEGER NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("department_id")
);

-- CreateTable
CREATE TABLE "public"."documents" (
    "doc_id" SERIAL NOT NULL,
    "doc_type" INTEGER,
    "doc_name" VARCHAR(255),
    "create_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("doc_id")
);

-- CreateTable
CREATE TABLE "public"."envocc_card_files" (
    "envocc_card_file_id" SERIAL NOT NULL,
    "user" INTEGER,
    "file_card_name" VARCHAR(255),
    "create_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "envocc_card_files_pkey" PRIMARY KEY ("envocc_card_file_id")
);

-- CreateTable
CREATE TABLE "public"."epositions" (
    "eposition_id" INTEGER NOT NULL,
    "eposition_name_th" VARCHAR(255) NOT NULL,
    "eposition_name_eng" VARCHAR(255) NOT NULL,
    "institution" INTEGER NOT NULL,

    CONSTRAINT "epositions_pkey" PRIMARY KEY ("eposition_id")
);

-- CreateTable
CREATE TABLE "public"."exp_files" (
    "exp_file_id" SERIAL NOT NULL,
    "user" INTEGER,
    "file_name" VARCHAR(255),
    "create_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exp_files_pkey" PRIMARY KEY ("exp_file_id")
);

-- CreateTable
CREATE TABLE "public"."experiences" (
    "exp_id" SERIAL NOT NULL,
    "user" INTEGER,
    "exp_fdate" DATE,
    "exp_ldate" DATE,
    "exp_typeoffice" INTEGER,
    "exp_office" VARCHAR(255),
    "exp_position" VARCHAR(255),
    "exp_work" VARCHAR(255),
    "create_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("exp_id")
);

-- CreateTable
CREATE TABLE "public"."experiences_files" (
    "experience_file_id" SERIAL NOT NULL,
    "admin" INTEGER,
    "exp_file" VARCHAR(255),
    "create_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiences_files_pkey" PRIMARY KEY ("experience_file_id")
);

-- CreateTable
CREATE TABLE "public"."gov_card_files" (
    "gov_card_file_id" SERIAL NOT NULL,
    "user" INTEGER,
    "file_name" VARCHAR(255),
    "create_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gov_card_files_pkey" PRIMARY KEY ("gov_card_file_id")
);

-- CreateTable
CREATE TABLE "public"."institutions" (
    "institution_id" INTEGER NOT NULL,
    "institution_code" VARCHAR(10) NOT NULL,
    "institution_name_th" VARCHAR(255) NOT NULL,
    "institution_name_eng" VARCHAR(255) NOT NULL,
    "department" INTEGER NOT NULL,
    "province" INTEGER NOT NULL,
    "health_region" INTEGER NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("institution_id")
);

-- CreateTable
CREATE TABLE "public"."members" (
    "member_id" SERIAL NOT NULL,
    "member_no" INTEGER,
    "user" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "qrcode" VARCHAR(255) NOT NULL,
    "qrcode_pass" VARCHAR(255) NOT NULL,
    "signer" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "num_print" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "members_pkey" PRIMARY KEY ("member_id","start_date")
);

-- CreateTable
CREATE TABLE "public"."ministries" (
    "ministry_id" INTEGER NOT NULL,
    "ministry_name_th" VARCHAR(255) NOT NULL,
    "ministry_name_eng" VARCHAR(255) NOT NULL,

    CONSTRAINT "ministries_pkey" PRIMARY KEY ("ministry_id")
);

-- CreateTable
CREATE TABLE "public"."photos" (
    "photo_id" SERIAL NOT NULL,
    "user" INTEGER,
    "photo" VARCHAR(255),
    "create_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("photo_id")
);

-- CreateTable
CREATE TABLE "public"."request_files" (
    "request_file_id" SERIAL NOT NULL,
    "user" INTEGER,
    "file_name" VARCHAR(255),
    "create_date" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_files_pkey" PRIMARY KEY ("request_file_id")
);

-- CreateTable
CREATE TABLE "public"."request_statuses" (
    "status_id" INTEGER NOT NULL,
    "status_name" VARCHAR(255) NOT NULL,

    CONSTRAINT "request_statuses_pkey" PRIMARY KEY ("status_id")
);

-- CreateTable
CREATE TABLE "public"."requests" (
    "req_id" SERIAL NOT NULL,
    "user" INTEGER,
    "request_status" INTEGER NOT NULL,
    "request_type" INTEGER NOT NULL,
    "approver" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "date_update" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("req_id","request_status","date_update")
);

-- CreateTable
CREATE TABLE "public"."resetpass" (
    "resetpass_req_id" SERIAL NOT NULL,
    "user" INTEGER,
    "user_email" VARCHAR(255),
    "token" VARCHAR(255),
    "expiration_time" TIME(0),

    CONSTRAINT "resetpass_pkey" PRIMARY KEY ("resetpass_req_id")
);

-- CreateTable
CREATE TABLE "public"."seals" (
    "seal_id" INTEGER NOT NULL,
    "seal_pix" VARCHAR(255),

    CONSTRAINT "seals_pkey" PRIMARY KEY ("seal_id")
);

-- CreateTable
CREATE TABLE "public"."sign_persons" (
    "sign_person_id" INTEGER NOT NULL,
    "sing_person_pname" VARCHAR(100),
    "sign_person_name" VARCHAR(255),
    "sign_person_lname" VARCHAR(255),
    "signature_pix" VARCHAR(255),
    "department" INTEGER,
    "position" VARCHAR(255),
    "sing_person_active" VARCHAR(100),

    CONSTRAINT "sign_persons_pkey" PRIMARY KEY ("sign_person_id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "user_id" SERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "pname_th" TEXT NOT NULL,
    "pname_other_th" VARCHAR(255) NOT NULL,
    "fname_th" VARCHAR(255) NOT NULL,
    "lname_th" VARCHAR(255) NOT NULL,
    "pname_en" TEXT NOT NULL,
    "pname_other_en" VARCHAR(255) NOT NULL,
    "fname_en" VARCHAR(255) NOT NULL,
    "lname_en" VARCHAR(255) NOT NULL,
    "birthday" DATE NOT NULL,
    "nationality" INTEGER NOT NULL,
    "blood" TEXT NOT NULL,
    "work_number" TEXT NOT NULL,
    "private_number" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "house_number1" VARCHAR(255) NOT NULL,
    "moo1" INTEGER NOT NULL,
    "alley1" VARCHAR(255) NOT NULL,
    "road1" VARCHAR(255) NOT NULL,
    "province1" INTEGER NOT NULL,
    "amphures1" INTEGER NOT NULL,
    "districts1" INTEGER NOT NULL,
    "zip_code1" INTEGER NOT NULL,
    "house_number2" VARCHAR(255) NOT NULL,
    "moo2" VARCHAR(255) NOT NULL,
    "alley2" VARCHAR(255) NOT NULL,
    "road2" VARCHAR(255) NOT NULL,
    "province2" INTEGER NOT NULL,
    "amphures2" INTEGER NOT NULL,
    "district2" INTEGER NOT NULL,
    "zip_code2" INTEGER NOT NULL,
    "institution" INTEGER NOT NULL,
    "eposition" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "position_lv" INTEGER NOT NULL,
    "e_learning" INTEGER NOT NULL,
    "approve" BOOLEAN NOT NULL,
    "is_validate" BOOLEAN NOT NULL DEFAULT false,
    "create_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("username","email","user_id")
);

-- CreateTable
CREATE TABLE "public"."positions" (
    "position_id" INTEGER NOT NULL,
    "position_name" VARCHAR(100),
    "position_name_eng" VARCHAR(100),

    CONSTRAINT "positions_pkey" PRIMARY KEY ("position_id")
);

-- CreateTable
CREATE TABLE "public"."position_lvs" (
    "position_lv_id" INTEGER NOT NULL,
    "position_lv_name" VARCHAR(100),
    "position_lv_name_eng" VARCHAR(100),

    CONSTRAINT "position_lvs_pkey" PRIMARY KEY ("position_lv_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "level_id" ON "public"."access_levels"("level_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_id" ON "public"."admins"("admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "public"."admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "public"."admins"("email");

-- CreateIndex
CREATE INDEX "admins_institution_idx" ON "public"."admins"("institution");

-- CreateIndex
CREATE INDEX "level" ON "public"."admins"("level");

-- CreateIndex
CREATE UNIQUE INDEX "department_id" ON "public"."departments"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_seal" ON "public"."departments"("department_seal");

-- CreateIndex
CREATE INDEX "ministry" ON "public"."departments"("ministry");

-- CreateIndex
CREATE UNIQUE INDEX "doc_id" ON "public"."documents"("doc_id");

-- CreateIndex
CREATE UNIQUE INDEX "envocc_card_file_id" ON "public"."envocc_card_files"("envocc_card_file_id");

-- CreateIndex
CREATE INDEX "envocc_card_files_user_idx" ON "public"."envocc_card_files"("user");

-- CreateIndex
CREATE UNIQUE INDEX "eposition_id" ON "public"."epositions"("eposition_id");

-- CreateIndex
CREATE UNIQUE INDEX "exp_file_id" ON "public"."exp_files"("exp_file_id");

-- CreateIndex
CREATE INDEX "exp_files_user_idx" ON "public"."exp_files"("user");

-- CreateIndex
CREATE UNIQUE INDEX "exp_id" ON "public"."experiences"("exp_id");

-- CreateIndex
CREATE INDEX "experiences_user_idx" ON "public"."experiences"("user");

-- CreateIndex
CREATE UNIQUE INDEX "experience_file_id" ON "public"."experiences_files"("experience_file_id");

-- CreateIndex
CREATE INDEX "admin" ON "public"."experiences_files"("admin");

-- CreateIndex
CREATE UNIQUE INDEX "gov_card_file_id" ON "public"."gov_card_files"("gov_card_file_id");

-- CreateIndex
CREATE INDEX "gov_card_files_user_idx" ON "public"."gov_card_files"("user");

-- CreateIndex
CREATE UNIQUE INDEX "institution_id" ON "public"."institutions"("institution_id");

-- CreateIndex
CREATE INDEX "institutions_department_idx" ON "public"."institutions"("department");

-- CreateIndex
CREATE UNIQUE INDEX "members_member_id_key" ON "public"."members"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_user_key" ON "public"."members"("user");

-- CreateIndex
CREATE UNIQUE INDEX "ministry_id" ON "public"."ministries"("ministry_id");

-- CreateIndex
CREATE UNIQUE INDEX "photo_id" ON "public"."photos"("photo_id");

-- CreateIndex
CREATE INDEX "photos_user_idx" ON "public"."photos"("user");

-- CreateIndex
CREATE UNIQUE INDEX "request_file_id" ON "public"."request_files"("request_file_id");

-- CreateIndex
CREATE INDEX "request_files_user_idx" ON "public"."request_files"("user");

-- CreateIndex
CREATE UNIQUE INDEX "status_id" ON "public"."request_statuses"("status_id");

-- CreateIndex
CREATE UNIQUE INDEX "req_id" ON "public"."requests"("req_id");

-- CreateIndex
CREATE INDEX "approver" ON "public"."requests"("approver");

-- CreateIndex
CREATE INDEX "request_status" ON "public"."requests"("request_status");

-- CreateIndex
CREATE INDEX "requests_user_idx" ON "public"."requests"("user");

-- CreateIndex
CREATE UNIQUE INDEX "resetpass_req_id" ON "public"."resetpass"("resetpass_req_id");

-- CreateIndex
CREATE INDEX "user" ON "public"."resetpass"("user");

-- CreateIndex
CREATE INDEX "user_email" ON "public"."resetpass"("user_email");

-- CreateIndex
CREATE UNIQUE INDEX "seal_id" ON "public"."seals"("seal_id");

-- CreateIndex
CREATE UNIQUE INDEX "sign_person_id" ON "public"."sign_persons"("sign_person_id");

-- CreateIndex
CREATE INDEX "department" ON "public"."sign_persons"("department");

-- CreateIndex
CREATE UNIQUE INDEX "user_id" ON "public"."users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "email" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "institution" ON "public"."users"("institution");

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_ibfk_1" FOREIGN KEY ("level") REFERENCES "public"."access_levels"("level_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_ibfk_2" FOREIGN KEY ("institution") REFERENCES "public"."institutions"("institution_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_position_fkey" FOREIGN KEY ("position") REFERENCES "public"."positions"("position_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."admins" ADD CONSTRAINT "admins_position_lv_fkey" FOREIGN KEY ("position_lv") REFERENCES "public"."position_lvs"("position_lv_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_ibfk_1" FOREIGN KEY ("ministry") REFERENCES "public"."ministries"("ministry_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_ibfk_2" FOREIGN KEY ("department_seal") REFERENCES "public"."seals"("seal_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."envocc_card_files" ADD CONSTRAINT "envocc_card_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."epositions" ADD CONSTRAINT "epositions_institution_fkey" FOREIGN KEY ("institution") REFERENCES "public"."institutions"("institution_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exp_files" ADD CONSTRAINT "exp_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiences" ADD CONSTRAINT "experience_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."experiences_files" ADD CONSTRAINT "experiences_files_ibfk_1" FOREIGN KEY ("admin") REFERENCES "public"."admins"("admin_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."gov_card_files" ADD CONSTRAINT "gov_card_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."institutions" ADD CONSTRAINT "institutions_ibfk_1" FOREIGN KEY ("department") REFERENCES "public"."departments"("department_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."members" ADD CONSTRAINT "members_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."photos" ADD CONSTRAINT "photos_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."request_files" ADD CONSTRAINT "request_files_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_ibfk_2" FOREIGN KEY ("approver") REFERENCES "public"."admins"("admin_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."requests" ADD CONSTRAINT "requests_ibfk_3" FOREIGN KEY ("request_status") REFERENCES "public"."request_statuses"("status_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."resetpass" ADD CONSTRAINT "resetpass_ibfk_1" FOREIGN KEY ("user") REFERENCES "public"."users"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."resetpass" ADD CONSTRAINT "resetpass_ibfk_2" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."sign_persons" ADD CONSTRAINT "sign_persons_ibfk_1" FOREIGN KEY ("department") REFERENCES "public"."departments"("department_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_ibfk_1" FOREIGN KEY ("institution") REFERENCES "public"."institutions"("institution_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_position_fkey" FOREIGN KEY ("position") REFERENCES "public"."positions"("position_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_position_lv_fkey" FOREIGN KEY ("position_lv") REFERENCES "public"."position_lvs"("position_lv_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_eposition_fkey" FOREIGN KEY ("eposition") REFERENCES "public"."epositions"("eposition_id") ON DELETE RESTRICT ON UPDATE CASCADE;
