-- Request Types (see CONTEXT.md). The rows are inserted here as well as by the
-- seed so that the foreign key holds from the moment it is added.
CREATE TABLE "request_types" (
    "type_id" INTEGER NOT NULL,
    "type_name" VARCHAR(255) NOT NULL,

    CONSTRAINT "request_types_pkey" PRIMARY KEY ("type_id")
);

INSERT INTO "request_types" ("type_id", "type_name") VALUES
  (1, 'ครั้งแรก'),
  (2, 'บัตรหมดอายุ'),
  (3, 'บัตรสูญหาย'),
  (4, 'บัตรถูกทำลาย'),
  (5, 'เปลี่ยนชื่อตัว'),
  (6, 'เปลี่ยนชื่อสกุล'),
  (7, 'เปลี่ยนชื่อตัวและชื่อสกุล'),
  (8, 'เปลี่ยนคำนำหน้าชื่อตัว'),
  (9, 'เลื่อนยศหรือชั้นหรือระดับ'),
  (10, 'เปลี่ยนตำแหน่ง'),
  (11, 'ย้ายสังกัด');

-- NOT VALID: POST users/me/card used to accept any requestType, so older
-- entries may hold a number outside 1-11. They are kept as they are; every new
-- entry must name a Request Type.
ALTER TABLE "requests" ADD CONSTRAINT "requests_request_type_fkey" FOREIGN KEY ("request_type") REFERENCES "request_types"("type_id") ON DELETE RESTRICT ON UPDATE NO ACTION NOT VALID;
