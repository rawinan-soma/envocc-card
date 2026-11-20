-- Request Statuses 2, 3 and 5 are retired and no route moves a user out of
-- them, so each user whose latest Status History entry is one of them gets a
-- new entry: 2 (photo rejected) → 6, 3 (still to upload) → 1, 5 → 4. The
-- entry keeps the Request Type and has no approver.
INSERT INTO "requests" ("userId", "request_status", "request_type", "approver", "description")
SELECT
  "userId",
  CASE "request_status" WHEN 2 THEN 6 WHEN 3 THEN 1 WHEN 5 THEN 4 END,
  "request_type",
  NULL,
  'ย้ายอัตโนมัติ: เลิกใช้สถานะ ' || "request_status"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "request_status", "request_type"
  FROM "requests"
  ORDER BY "userId", "date_update" DESC, "id" DESC
) AS latest
WHERE "request_status" IN (2, 3, 5);
