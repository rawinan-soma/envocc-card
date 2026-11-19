# Admin user routes

Admins see and manage users in their own organization and the organizations below it. Ministry admins can also list every user system-wide. Admins can read the request form and experience form of a user in their organization, the same data the user gets from their own routes.

## Sub-features

- `users-list-org` lists only users in the admin's org tree, filtered by status group (`ongoing` 0–14, `activated` 15, `suspended` 16) and searched by Thai name or org name.
- `users-list-all` lets a Ministry admin list every user with `GET admins/users/all` (including `username`). A department admin gets 403 `admin not at ministry level`.
- `users-request-form` reads a user's request form or experience form: `GET admins/users/:userId/requests/form|exp`. A user outside the admin's org returns a refusal.
- `users-delete` deletes a user with `DELETE admins/users/:id`.

## How to get to it (user POV)

- The admin dashboard calls `GET admins/users?page=1&status=<group>&search_term=<text>`.
- The Ministry dashboard calls `GET admins/users/all?page=1&search_term=<text>`.
- User detail calls `GET admins/users/<uid>/requests/form` and `GET admins/users/<uid>/requests/exp`.

## Driving it with api.sh

Preconditions:

- From [accounts.md](./accounts.md): `verify.admin` (org 4) as `admin`, `verify.moph` (org 1, MINISTRY) as `moph`, and one registered user in org 4 with `<uid>`.

- **Org list.** Run `$S/api.sh admin GET 'admins/users?page=1&status=ongoing'`. HTTP 200, and `data` contains the user, with `pageData.totalItems` counting only org 4's tree.
- **All users refused for a department admin.** Run `$S/api.sh admin GET 'admins/users/all?page=1'`. HTTP 403 with `admin not at ministry level`.
- **All users for a Ministry admin.** Run `$S/api.sh moph GET 'admins/users/all?page=1'`. HTTP 200, and each item has `username` (here `verify.user`).
- **Request form.** Run `$S/api.sh admin GET admins/users/<uid>/requests/form`. HTTP 200, and the body matches what `$S/api.sh user GET users/me/requests/form` returns once the user is validated.
- **Foreign org refused.** Register an admin in org 2 (`"orgId":2`, actor `other`), log in, and run `$S/api.sh other GET admins/users/<uid>/requests/form`. Expect a 4xx refusal and no form data.

## Gotchas

- `GET admins/users` returns 400 when `status` is missing.
- The Ministry and MOPH guards read the admin's organization from the database on each request, so the login `level` field alone proves nothing. Prove access with the guarded call.
- `DELETE admins/users/:id` is not org-scoped. Prove deletions with `db.sh`, and use a throwaway user.
