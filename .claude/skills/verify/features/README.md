# EnvOcc Card verification map

This is the maintained source for verifying the user-facing behavior of the EnvOcc Card API. Read this index before driving the app, then use the matching feature file as the recipe. Domain terms (Request Status, Revert, Document upload, Ministry admin, MOPH admin) are defined in `CONTEXT.md`.

## Baseline preconditions

- A stack started by this run with `.claude/skills/verify/scripts/up.sh`, and `doctor.sh` exits 0 for its `VERIFY_RUN`.
- The database holds only the seed: organizations, positions, request statuses, seals and signatures, and 12 seeded admins whose passwords are unknown. There are no users.
- `S=.claude/skills/verify/scripts` and `F=.claude/skills/verify/fixtures`.

## Driving conventions

- Every call goes through `VERIFY_RUN=<id> $S/api.sh <actor> <METHOD> <path> [curl args]`. Actor names used in recipes: `anon` (no login), `admin` (department admin of org 4), `moph` (admin of org 1), `user` (the registered user).
- Create accounts with [accounts.md](./accounts.md) first. Each recipe names which accounts it needs.
- User ids come from responses or from the admin user list, never from guessing. A fresh database gives the first user id 1 and the first new admin id 13, but read them from the responses anyway.
- Status moves go through routes: approve with `PATCH admins/users/validate/:id`, upload with `POST users/me/files`, admin steps with `POST admins/users/requests/update`, and Reverts with `POST admins/users/:userId/requests/revert`.

## Proof and skip reporting

- Proof for a mutation is the call plus a second read of the new state (`GET users/me/requests/latest` or `db.sh`), plus files in `assets.sh` when files are involved.
- Proof for a guard is the refused call with its status code and message, plus a read showing nothing changed.
- Record the feature id from the feature file next to each claim, and point to the run's `transcript.md`.
- When a precondition cannot be reached through routes, report the journey as failed, name the missing precondition, and add it to that feature's `Gotchas`. Never weaken a journey to make it pass.

## Feature entry contract

Each feature file has an H1 title and one paragraph, then exactly these H2s in order: `Sub-features`, `How to get to it (user POV)`, `Driving it with api.sh`, `Gotchas`.

## Features

- [Accounts](./accounts.md): register users and admins, log in, refresh, log out, read `me`.
- [Approve a registration](./approve-registration.md): an admin approves a new user (Request Status 0 → 1), and the routes that need a validated user unlock.
- [Document upload](./document-upload.md): the user (or an admin for them) sends the government card, photo and experience form, which moves the request to Request Status 4.
- [Status steps and Revert](./status-and-revert.md): admins move a request forward and Revert it, with the org, level and file-deletion rules.
- [Admin user routes](./admin-user-routes.md): the org-scoped user list, the Ministry-only all-users list, and reading a user's request form.
