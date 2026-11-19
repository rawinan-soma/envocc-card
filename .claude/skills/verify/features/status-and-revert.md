# Status steps and Revert

Admins move a card request forward through its Request Statuses (see the table in `CONTEXT.md`) and, when something is wrong, Revert it to an earlier status. Every move adds a Status History entry, except a Revert to 0, which wipes the history and the uploads and makes the user unapproved again. Only DEPARTMENT or MINISTRY admins of the user's own organization may Revert, and only along the allowed moves.

## Sub-features

- `step-forward` moves a request forward with `POST admins/users/requests/update`, using `current_status` matched against the latest entry.
- `step-mismatch` refuses a stale `current_status` with 400 `user's status mismatched`.
- `step-back-is-revert` refuses moving back to a Revert target through update with 400, naming the revert route.
- `revert-1-or-6` Reverts to 1 or 6 and deletes the chosen files (`delete_files`: `photo`, `govcard`, `expfile`).
- `revert-0` resets a first-card request completely: history and uploads are deleted and the user is unapproved.
- `revert-forbidden` refuses a Revert from an admin outside the org, from a lower-level admin, or along a move not on the list.

## How to get to it (user POV)

- An admin moves the request forward with `POST admins/users/requests/update` and body `{"user":<uid>,"current_status":N,"next_status":M,"request_type":T}`.
- An admin Reverts with `POST admins/users/<uid>/requests/revert` and body `{"current_status":N,"target_status":M,"delete_files":[...],"description":"..."}`.

## Driving it with api.sh

Preconditions:

- A user at Request Status 4 after [document-upload.md](./document-upload.md), and `verify.admin` (org 4, DEPARTMENT) logged in as `admin`.

- **Forward 4 → 7.** Run `$S/api.sh admin POST admins/users/requests/update -H 'Content-Type: application/json' -d '{"user":<uid>,"current_status":4,"next_status":7,"request_type":1,"description":""}'`. HTTP 201, and `GET users/me/requests/latest` as `user` shows `7`.
- **Stale status.** Repeat the same call. HTTP 400 with `user's status mismatched`.
- **Back through update refused.** Run the update with `"current_status":7,"next_status":6`. HTTP 400 telling you to use `POST admins/users/:userId/requests/revert`.
- **Revert to 6 and delete the photo.** Run `$S/api.sh admin POST admins/users/<uid>/requests/revert -H 'Content-Type: application/json' -d '{"current_status":7,"target_status":6,"delete_files":["photo"],"description":"photo blurry"}'`. HTTP 201. The user's latest status is then `6`, `db.sh 'select count(*) from photos where "userId"=<uid>'` gives `0`, the govcard row remains, and `assets.sh` no longer lists the photo file.
- **Revert to 0.** Run the revert with `"current_status":6,"target_status":0`. HTTP 201. Then `db.sh 'select count(*) from requests where "userId"=<uid>'` shows only the fresh entry, `is_validate` is `f`, and `assets.sh` lists no files for this user.

## Gotchas

- `description` is declared `IsString` without `IsOptional` on the update route. Send `""` rather than leaving it out.
- `revert-forbidden` needs a second admin. Register one in another org (for example org 2, MINISTRY, not MOPH) to prove the cross-org refusal.
- ADR 0003 (in progress on this branch) says requests of types 2–11 cannot be Reverted to 0. Proving that needs a user with an issued card (status 15) who then starts a new request via `POST users/me/card?requestType=N`. That means walking the full chain 4 → 7 → 8 → 9/10 → 15 through the update route first.
