# Document upload

At Request Status 1 (or 6, when correcting), the user sends their documents in one request: the government card (required unless already stored), a photo (required when none is stored) and optionally an experience form. On success the request moves to Request Status 4, and the files are stored on disk and in the file tables. An admin may send the same upload for a user at any Request Status. For a lost card (Request Type 3) a police report is also required.

## Sub-features

- `upload-user` sends a user upload at status 1, which moves the request to 4 and stores the files.
- `upload-wrong-status` refuses a user upload at any status other than 1 or 6 with 403, and stores nothing.
- `upload-correction` lets the user upload again at status 6 after a Revert, which moves the request to 4.
- `upload-missing-required` refuses an upload with no government card and no stored one with 400 `govcard is required`.
- `upload-bad-type` refuses a file with the wrong extension with 400 `unsupported file type`.
- `upload-admin` lets an admin upload for a user through `POST admins/users/:userId/files`.
- `upload-replace-photo` lets the user replace the photo with `PUT users/me/photo`, only at status 1 or 6.

## How to get to it (user POV)

- The user sends `POST users/me/files` as multipart, with fields `govCard` (.pdf), `experienceForm` (.pdf) and `photo` (.jpg/.png).
- An admin sends `POST admins/users/:userId/files` with the same fields.
- The user reads a stored file with `GET users/me/files/<govcard|photo|expfile>`.

## Driving it with api.sh

Preconditions:

- A user approved through [approve-registration.md](./approve-registration.md), now at Request Status 1, logged in as actor `user`, with `<uid>` known.
- `F=.claude/skills/verify/fixtures`.

- **Wrong type refused.** Run `$S/api.sh user POST users/me/files -F govCard=@$F/photo.png`. HTTP 400 with `unsupported file type`.
- **Upload.** Run `$S/api.sh user POST users/me/files -F govCard=@$F/govcard.pdf -F photo=@$F/photo.png`. HTTP 201 with an empty body.
- **Status moved.** Run `$S/api.sh user GET users/me/requests/latest`. HTTP 200 with `"request_status":4`, an empty approver and `"request_type":1`.
- **Rows stored.** Run `$S/db.sh 'select '"'"'govcard'"'"' kind, url from gov_card_files where "userId"=<uid> union all select '"'"'photo'"'"', url from photos where "userId"=<uid>'`. One row each, with URLs under `/app/assets/`.
- **Files on disk.** Run `$S/assets.sh`. It lists `govCard-<…>.pdf` and `photo-<…>.png`, matching the URLs above.
- **User read-back.** Run `$S/api.sh user GET users/me/files/govcard`. HTTP 200, and `filename` matches.
- **Wrong status refused.** Run the same upload again (now at status 4). HTTP 403 with `documents can be uploaded only at request status …`, and `assets.sh` lists the same two files as before.
- **Correction upload.** Revert the request to 6 ([status-and-revert.md](./status-and-revert.md)), then run the upload again. HTTP 201 and the status becomes `4`.

## Gotchas

- Run on 2026-11-19 at `439c9b6`: the refusal message read `request status 1, 3`. The code allows statuses `[1, 3]` (`STEP_THREE_RULES` in `src/files/files.service.ts`), but `CONTEXT.md` says 1 or 6 and that status 3 is unused. Until that is fixed, `upload-correction` is expected to **fail** with 403. Report it as a failure. Don't skip it.
- Field names are camelCase (`govCard`, `experienceForm`), but the read-back route uses `govcard`, `expfile` and `photo`.
- A refused upload deletes the files it had just written. Check `assets.sh` to prove that, and don't rely on the status code alone.
- The upload response body is empty on success. Prove the move with the status read.
- To reach status 6 for a correction upload, use a Revert ([status-and-revert.md](./status-and-revert.md)). Don't insert a history row.
