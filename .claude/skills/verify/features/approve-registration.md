# Approve a registration

A new user sits at Request Status 0 (the admin checks the registration) and cannot use the validated-user routes. An admin of the user's organization approves them, which sets the user validated and adds a Status History entry 0 → 1 with that admin as approver. From then on the user can read their request and upload documents.

## Sub-features

- `approve-blocked` makes a validated-user route such as `GET users/me/requests/latest` return 403 `user not validated` before approval.
- `approve-ok` has the admin approve the user, which moves them to status 1 with the admin as approver.
- `approve-twice` makes a second approval return 400 `user already activated`.
- `approve-unlocks` lets the same user session reach the validated routes without logging in again.

## How to get to it (user POV)

- An admin finds the user in the pending list (`GET admins/users?status=ongoing`) and approves them with `PATCH admins/users/validate/:id`.

## Driving it with api.sh

Preconditions:

- From [accounts.md](./accounts.md): `verify.admin` (org 4) logged in as actor `admin`, and `verify.user` (org 4) registered and logged in as actor `user`.

- **Blocked before approval.** Run `$S/api.sh user GET users/me/requests/latest`. HTTP 403 with `"message":"user not validated"`.
- **Find the user.** Run `$S/api.sh admin GET "admins/users?page=1&status=ongoing&search_term=%E0%B8%97%E0%B8%94%E0%B8%AA%E0%B8%AD%E0%B8%9A"` (the search term is `ทดสอบ`, URL-encoded). HTTP 200 and `data` holds one user with `"request_status":0`. Note its `id` as `<uid>`.
- **Approve.** Run `$S/api.sh admin PATCH admins/users/validate/<uid>`. HTTP 200 with `{"id":…,"request_status":1}`.
- **Same session unlocked.** Run `$S/api.sh user GET users/me/requests/latest`. HTTP 200 with `"request_status":1,"request_type":1` and `"approver"` equal to the admin id from login.
- **History.** Run `$S/db.sh 'select request_status, request_type, approver from requests where "userId"=<uid> order by id'`. Two rows: `0` with an empty approver, then `1` with the admin id.
- **Twice.** Run `$S/api.sh admin PATCH admins/users/validate/<uid>`. HTTP 400 with `user already activated`.

## Gotchas

- `search_term` matches the Thai first name, Thai last name or organization name, never the username. Searching `verify` returns nothing.
- `status` is required on `GET admins/users` (`ongoing`, `activated` or `suspended`). Without it the API returns 400.
- `PATCH admins/users/validate/:id` does not check that the user is in the admin's organization. Don't assume a refusal for a foreign org here.
