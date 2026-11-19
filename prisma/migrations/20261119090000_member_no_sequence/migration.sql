-- Member Numbers come from a sequence: nextval is atomic, so concurrent card
-- creations never share a number, and it never goes back, so a deleted
-- user's number is never given to anyone else.
CREATE SEQUENCE members_member_no_seq;
ALTER TABLE "members" ALTER COLUMN "member_no" SET DEFAULT nextval('members_member_no_seq');
ALTER SEQUENCE members_member_no_seq OWNED BY "members"."member_no";

-- Continue after the highest number already given. Numbers of users deleted
-- before this migration are not known and may still be given out once.
SELECT setval('members_member_no_seq', COALESCE((SELECT MAX("member_no") FROM "members"), 0) + 1, false);
