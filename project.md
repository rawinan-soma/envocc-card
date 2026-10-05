# EnvOcc Card API — Project Summary

Backend REST API for the **EnvOcc Card** system (บัตรประจำตัวพนักงาน/ผู้ปฏิบัติงานด้านอาชีวเวชศาสตร์และเวชศาสตร์สิ่งแวดล้อม) — a Thai government workflow for applying for, approving, printing, and verifying an occupational/environmental-health credential card.

The system serves two distinct actor types (**users** = card applicants, **admins** = organization officers who review and approve), plus a small set of **public/common** endpoints used by the card-verification (QR) flow.

---

## 1. Tech stack

| Concern | Choice |
|---|---|
| Runtime / package manager | **Bun** 1.3.0 (pinned via `mise.toml`); Docker image `oven/bun:1.1.29` |
| Framework | **NestJS 11** (Express platform) |
| Database | **PostgreSQL 17** via **Prisma 6** |
| Auth | Passport (`passport-local` + `passport-jwt`), JWT in **httpOnly cookies**, bcrypt hashing |
| Background jobs | **BullMQ** + Redis (`@nestjs/bullmq`) |
| Email | **Nodemailer** over Gmail SMTP |
| Uploads | Multer disk storage → `./assets`, served statically at `/app/assets` |
| Validation | `class-validator` / `class-transformer`, global `ValidationPipe({transform, whitelist})` |
| Docs | Swagger at `/apidoc` (title "EnvOcc Card API", v2.0) |
| Hardening | `helmet`, `@nestjs/throttler` (10 req / 60 s, module-level only), CORS enabled (permissive) |
| Deploy | Docker Compose (`postgres` + `redis` + `api`), image `rawinan/envocc-card-api:stagging` |

Global route prefix: **`envocc-card/api/v2`** (from `ENDPOINT_PREFIX`).

---

## 2. Repository layout

```
prisma/
  schema.prisma          # single source of truth for the DB
  migrations/            # 22 migrations, Aug 2025 → Jan 2026
  seed.ts                # transactional upsert seeder (bun prisma/seed.ts)
  data/*.json            # seed fixtures: provinces, orgs, positions, statuses, admins, seals, signers…
  prisma.service.ts      # PrismaClient wrapper (OnModuleInit/Destroy)
  prisma.module.ts       # @Global module exporting PrismaService
src/
  main.ts app.module.ts  # bootstrap + root wiring
  shared/                # CommonAuthService (JWT/cookies), multer options, decorators
  admin-auth/ user-auth/ # two parallel Passport stacks (local + jwt access + jwt refresh)
  auth/                  # shared password-reset (token redemption)
  admins/ users/         # profile + listing services
  organizations/         # recursive org hierarchy
  positions/ experiences/
  members/               # the issued card itself (member_no, QR, validity dates)
  request/               # workflow status machine
  files/ common-documents/ seals/ signatures/
  mail/ queue/           # nodemailer + BullMQ processors
test/                    # e2e scaffold (default Nest template only)
docker-compose.yaml Dockerfile makefile mise.toml
```

Naming convention: controllers are split by audience — `admin-*.controller.ts`, `user-*.controller.ts`, `public-*.controller.ts`, `common-*.controller.ts` — all sharing one service per module.

---

## 3. Domain model (Prisma)

### Core entities

- **`organizations`** — self-referencing hierarchy via `parentId`/`children`, tagged with `OrgLevel` enum: `MINISTRY → DEPARTMENT → REGION → PROVINCE → UNIT`. Each org points to exactly one `seals` row and one `signatures` row (these cascade down to children when an admin uploads a new one). Optional `province` FK.
- **`admins`** — an officer bound to one `organizationId` and a `position_lvs`. Their org's *level* is what the frontend uses to decide UI permissions (returned on login/refresh as `level`). Holds `hashedRefreshToken`.
- **`users`** — the card applicant. Very wide table: Thai + English name parts with prefixes, `cid` (national ID, unique), birthday, blood group, two full addresses (registered + current: house/moo/alley/road/province/amphure/district/zip), contact numbers, `is_validate`, org + position + position level FKs. Composite `@@id([username, email, id])` with `id` also `@unique`.
- **`members`** — the *issued card*. `member_no` (running number, reused on re-issue), `start_date`/`end_date` (5 years minus 1 day), `qrcode`, `qrcode_pass` (bcrypt), short-lived `qrcode_token`, `is_active`, `num_print`, and the `signatureId` snapshot used on the card.
- **`requests`** — append-only workflow log: one row per status transition (`userId`, `request_status`, `request_type`, `approver`, `description`, `date_update`). "Current status" = most recent row by `date_update`.
- **`request_statuses`** — the 17 workflow states (see §4).
- **`experiences`** — prior work history rows; `exp_years` is computed server-side from `exp_fdate`/`exp_ldate`, never trusted from the client.
- **`positions`** / **`position_lvs`** — job titles and civil-service levels. A position with a non-null `orgId` marks an **executive** (director) role; positions with `orgId = null` are the ordinary (non-executive) ones. IDs `201–207` are hard-coded as non-executive in `UserAuthService`.
- **`reset_tokens`** — password-reset tokens, nullable FK to either `users` or `admins`.

### File tables

`photos`, `envocc_card_files`, `gov_card_files`, `exp_files`, `request_files`, `documents` (general downloadable forms), `seals`, `signatures`. All follow the same `{filename, url, create_date}` shape; `FilesService` abstracts them behind a `FileModelMap` keyed by `'envcard' | 'expfile' | 'govcard' | 'photo' | 'reqFile'`.

### Dead schema

A large block of legacy models is commented out rather than deleted: `access_levels`, `ministries`, `departments`, `institutions`, `epositions`, and the old join tables (`adminOnOrg`, `userOnOrg`, `orgOnSeal`, `orgOnSignature`, `adminDep`, `adminInst`, `userDep`, `userInst`). The recursive `organizations` table replaced all of them (migration `20250915075329_recursive_table`). `experiences_files` survives in the schema but has no relations and is unused.

---

## 4. The card-request workflow

`request_statuses` drives the whole product. Statuses (from `prisma/data/request_statuses.json`):

| ID | Meaning |
|---|---|
| 0 | ตรวจสอบ Register (registration awaiting admin validation) |
| 1 | ตรวจสอบรูปถ่าย |
| 2 | แก้ไขรูปถ่าย |
| 3 | อัปโหลดเอกสาร |
| 4 | ตรวจสอบเอกสาร |
| 5 | Admin หน่วยงานแก้ไขเอกสาร |
| 6 | User แก้ไขข้อมูล |
| 7 | เลือกวิธีลงนาม (choose signing method) |
| 8 | เลือกวันที่อนุมัติ |
| 9 | E.พิมพ์บัตร (electronic print) |
| 10 | M.พิมพ์บัตร (manual print) |
| 11 | เลือกวันที่อนุมัติ |
| 12 | User อัปโหลดบัตรพนักงาน |
| 13 | Admin หน่วยงาน ตรวจสำเนาบัตร |
| 14 | User แก้ไขบัตรพนักงาน |
| **15** | **ยื่นขอมีบัตรสำเร็จ** (issued — the only state where a QR can be generated) |
| **16** | **บัตรถูกยกเลิก** (cancelled) |

Transitions go through `RequestService.updateStatus(dto, approver)`, which enforces optimistic consistency: the caller must send `current_status` matching the latest row, and `next_status` must differ. Notable hard-coded jumps elsewhere:

- `UserAuthService.createUser` seeds status **0** at registration.
- `UsersService.validateUser` (admin) flips `is_validate` and writes status **1** inside a transaction.
- `UsersService.txUploadFileandUpdateRequest` writes status **4** after the admin uploads the request/gov-card/experience PDFs.
- `MembersService.transactionCreateMember` writes the status carried in `signature_method` (7 → 8/11 branch) and creates the `members` row.
- `MembersService.transactionUpdateStartDate` only advances from **8** or **11** (`status + 1`) and computes `end_date = start_date + 5 years − 1 day`.
- Admin listing buckets: `ongoing` = 0–14, `activated` = 15, `suspended` = 16.

---

## 5. Authentication & authorization

Two **completely parallel** Passport stacks, distinguished only by cookie name and strategy name:

| | Admin | User |
|---|---|---|
| Local strategy | `admin-local` | `user-local` |
| Access strategy | `jwt-access-admin` | `jwt-access-user` |
| Refresh strategy | `jwt-refresh-admin` | `jwt-refresh-user` |
| Access cookie | `Authentication_Admin` | `Authentication_User` |
| Refresh cookie | `Refresh_Admin` | `Refresh_User` |

- `CommonAuthService` (in `shared/`) mints both tokens from `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` with `*_EXP` seconds, and builds the cookie options (`httpOnly`, `sameSite: lax`, **`secure: false`**).
- Token payload is minimal: `{ id }`. The JWT access strategy re-reads the row from Postgres on every request, so `request.user` carries `{ id, username, role, level? }`.
- Refresh tokens are bcrypt-hashed into `hashedRefreshToken` on the `admins`/`users` row and compared on refresh; logout nulls them out.
- **There is no role guard.** `shared/roles.guard.ts` and `roles.decorator.ts` exist but the guard is entirely commented out. Authorization is effectively "which cookie/guard does this controller require", plus data scoping by organization subtree.
- Data scoping: `getChildIds(orgId)` recursively walks `organizations.children` (duplicated in both `UsersService` and `AdminsService`) so an admin only sees users/admins within their own org subtree.
- User login additionally rejects `is_validate === false`.

### Password reset

Three-part flow shared by both actor types:
1. `POST users/auth/request-password-reset` or `POST admins/auth/request-password-reset` — invalidates prior unused tokens, creates a 32-byte hex token (**admin: 5 min TTL, user: 1 hour TTL** — inconsistent, and the email body says 5 minutes), enqueues an email job.
2. BullMQ `email` queue → `EmailProcessor` → `MailService.sendResetPasswordEmailActual` sends a Thai-language HTML email linking to `${FRONTEND_URL}/resetpassword?token=…`.
3. `POST auth/reset-password { token, newPass }` — validates not-used/not-expired, bcrypt-hashes, updates whichever of `userId`/`adminId` is set, marks the token used.

---

## 6. Modules & endpoints

All paths below are relative to `envocc-card/api/v2`.

### `AdminAuthModule` — `admins/auth`
`POST register` (unguarded), `POST login`, `POST refresh`, `POST logout`, `POST request-password-reset`.
Login/refresh return `{ id, role, level }` where `level` is the admin's **org level** — the frontend's permission signal.

### `UserAuthModule` — `users/auth`
`POST login`, `POST refresh`, `POST logout`, `POST register`, `POST request-password-reset`.
`register` accepts `{ user, experiences[] }`; if `experiences` is empty it routes to `createExecutiveUser`, which rejects position IDs 201–207 ("non-executive user required experiences").

### `AuthModule` — `auth`
`POST reset-password`.

### `AdminsModule` — `admins` (JWT admin)
`GET admins/admins?pages&id|username|email` (exactly one filter allowed), `GET admins/me`.

### `UsersModule`
Admin side (`AdminUserController`, JWT admin): `GET admins/users?page&status&search_term`, `DELETE admins/users/:id`, `PATCH admins/users/validate/:id`.
User side (`UsersController`, per-route guards): `GET users/me`, `PATCH users/me`, `GET users/me/requests/form` (fully-flattened print payload incl. org hierarchy names th/en and the signer's position), `GET users/me/requests/exp`, `POST users/me/card?requestType`, `POST users/me/files` (**guarded by the *admin* JWT** despite living on the `users` path — this is the admin uploading requestFile/govCard/experienceForm on the applicant's behalf), and `GET|POST|PATCH|DELETE users/me/experiences[/:expId]`.

### `MembersModule`
Admin: `GET admins/members/:userId`, `POST admins/members`, `PATCH admins/members/:userId/deactivate`, `PATCH admins/members/:userId/activate`.
User: `PATCH users/me/members/qrcode` (set QR password), `GET users/me/envcard/qrcode`.
Common (**unguarded**): `GET common/qrcode?qrcode_number`, `POST common/qrcode/validate`, `GET common/qrcode/verify?token`, `GET common/members/:userId`.

**QR verification flow:** the printed card carries an 8-digit `qrcode`; the holder sets a `qrcode_pass`. `validateQrCode` compares the password, mints an 8-digit `qrcode_token`, and enqueues a BullMQ `cleanup` job (`delete-qr-token`, 5-minute delay) that nulls the token. `verifyToken` exchanges the token for `user_id`. `getMemberByQrcode` refuses unless the user's latest request status is **15**.

### `RequestModule`
Admin: `POST admins/users/requests/update`, `DELETE admins/users/requests/:id`.
User: `GET users/me/requests/latest`, `POST users/me/requests`.

### `OrganizationsModule`
Admin: `POST admins/organizations` (creates a `UNIT` under the caller's org, inheriting its seal/signature/province, and auto-creates a director position `ผู้อำนวยการ<name>`), `GET admins/organizations?ministry=`, `PATCH admins/organizations/:orgId`.
Public: `GET public/organizations?q`, `GET public/organizations/:id` (flattens the ancestor chain into `unit/province/region/department/ministry` id+name pairs).

### `PositionsModule` — `GET public/positions?orgId`
No `orgId` → all non-executive positions. With `orgId` → that org's single executive position.

### `FilesModule`
User: `POST users/me/envcard` (.pdf), `POST users/me/photo` (.jpg/.png), `GET users/me/files/:file`.
Admin: `GET|DELETE admins/users/:userId/files/:file` — **the `@UseGuards(JwtAccessGuardAdmin)` is commented out on this controller.**

### `SealsModule` / `SignaturesModule` (JWT admin)
`POST admins/seals` (.png), `GET admins/seals`; `POST admins/signatures` (.png + signer name/position), `GET admins/signatures`. Both use a transaction that creates the new asset then re-points the admin's org **and its direct children** at it.

### `CommonDocumentsModule`
Admin: `POST admins/documents` (.pdf), `DELETE admins/documents/:docId` (unlinks the file from disk too). Public: `GET public/documents?docId`.

### `QueueModule` / `MailModule`
Two Bull queues: `cleanup` (QR-token expiry) and `email` (password-reset delivery). Circular dependency between the two modules resolved with `forwardRef`. Redis connection is configured **globally in `app.module.ts` as a literal `{ host: 'redis', port: 6379 }`**, ignoring the validated `REDIS_HOST`/`REDIS_PORT` env vars.

---

## 7. File uploads

`shared/file-multer-options.ts::getMulterOptions(extensions, maxBytes)` returns a Multer config with an extension whitelist, size cap, disk storage in `process.cwd()/assets`, and filenames `${fieldname}-${Date.now()}-${rand}${ext}`. All current call sites use a 10 MB cap. `FilesService` has a near-duplicate `getMulterOpitions` (sic) that additionally `mkdir -p`s the destination.

`ServeStaticModule` exposes `join(__dirname, '..', '..', 'assets')` at `/app/assets`; the compose file bind-mounts `./assets` into the container so uploads survive restarts.

---

## 8. Configuration & operations

Required env (validated by Joi at boot — the app refuses to start without them): `SERVER_URL`, `ENDPOINT_PREFIX`, `ACCESS_TOKEN_SECRET`, `ACCESS_TOKEN_EXP`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXP`, `REDIS_HOST`, `REDIS_PORT`; `SERVER_PORT` optional (default 3000).
Read but **not** validated: `DATABASE_URL`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `FRONTEND_URL`.

Note: `docker.env` and `.env` are committed and contain real-looking secrets (DB credentials, JWT secrets `topsecret`/`uppertopsecret`, a Gmail app password, Mailgun keys). `.gitignore` does not cover them. Worth rotating and moving to a secret store.

### Commands

```bash
bun install
bun run start:dev        # watch mode
bun run start:prod       # bun run dist/src/main.js
bun run seed             # bun run prisma/seed.ts
bun run lint             # eslint --fix
bun run test             # jest (unit) — only the default app.controller.spec.ts exists
bun run test:e2e

make start-dep           # docker compose up postgres + redis
make start-api           # docker compose up api + follow logs
make deploy              # build → push → pull → down -v → start-dep → start-api  (⚠️ `reset` wipes volumes)
mise run serve           # build + expose via ngrok on :3333
```

The compose `api` service runs `prisma generate → nest build → prisma migrate deploy → seed → start:prod` on every boot, so the seeder must stay idempotent (it is — everything is `upsert` inside one `$transaction`, with FK pre-validation that skips and warns on dangling references).

---

## 9. State of the code / things to know

- **Uncommitted work in progress** (`git status`): `admins.positionId` is being changed from `Int` (FK to `positions`) to a free-form `String`, dropping the `admins ↔ positions` relation; `admins.service.ts` and `admin-create.dto.ts` follow suit. Also, `UserAuthService.getAuthenticatedUser` had `is_validate: true` removed from the `where` clause (validation is now checked explicitly after lookup so it can return a distinct "user not validated" error). **`prisma/schema.prisma` has been edited but no matching migration exists yet.**
- **Pagination is done in memory.** `getAllUsers`, `getAllAdmins`, and `getAllOrganization` fetch every matching row, then `.slice(offset, offset + limit)`. Fine at current scale, a problem later.
- **`getAllUsers` hand-unrolls the org hierarchy 5 levels deep** in the Prisma `select`, then flattens with `pickLevelForRequestForm`. The same recursion trick appears in `getUserRequestForm`, `MembersService.getMember`, and `OrganizationService.getOrganizationById`, each with slightly different depth and shape.
- **Duplicated helpers:** `getChildIds` (users + admins services), `pickLevelForRequestForm` (users + members), `calculateExpYears` (user-auth + experiences), `createFileDtoMapper` (files service + users controller + user-file controller), `getMulterOptions` (shared + files service).
- **`ExperiencesModule` is never imported** by `AppModule` or `UsersModule`; `ExperiencesService` is listed directly in `UsersModule`'s providers instead, which is why the experience endpoints still work.
- **`ExperiencesService` returns exceptions instead of throwing them** (`return new InternalServerErrorException(...)`), so failures surface as 200 responses with an error-shaped body.
- **Throttling is registered but never applied** — `ThrottlerModule.forRoot` is imported with no `APP_GUARD` provider, so no rate limiting is actually in effect.
- **`ClassSerializerInterceptor` is global**, but no entity classes use `@Exclude`; password stripping is done manually via Prisma `omit`/`select` (and in a couple of places by assigning `password = ''` after comparison).
- `AdminSealController.getSealByIdHandler` / `AdminSignatureController.getSignatureByIdHandler` take `@Query()` without a key, so they receive the whole query object where a number is expected.
- Several `console.log`/`console.error` calls remain alongside the Nest `Logger` (`user-request.controller.ts`, `members.service.ts`).
- `admins.role` and `users.role` are plain strings defaulting to `'admin'`/`'user'`; combined with the disabled roles guard, they are informational only.
- Test coverage is effectively zero — only the scaffolded `AppController` spec and the default e2e file.
