# API changes for the frontend

Changes to the EnvOcc Card API since `b5a3abd` (agent skills setup), up to `ef036a9`.

- Every path below is under the global prefix `/envocc-card/api/v2`.
- Auth is cookie-based: admins send `Authentication_Admin`, users send `Authentication_User`. Both are set by the login endpoints.
- Errors use Nest's default body: `{ "message": …, "error": …, "statusCode": … }`.
- The data in the examples is illustrative; the field names and shapes match the code.

## Contents

- [Breaking changes](#breaking-changes)
  1. [`DELETE admins/users/requests/:id` removed](#1-delete-adminsusersrequestsid-removed)
  2. [`GET public/positions` returns an array](#2-get-publicpositions-returns-an-array)
  3. [Admin `positionId` is a string](#3-admin-positionid-is-a-string)
  4. [Unapproved users can log in; card-request routes need approval](#4-unapproved-users-can-log-in-card-request-routes-need-approval)
  5. [Admin file routes need an admin login](#5-admin-file-routes-need-an-admin-login)
  6. [The admin document upload moved to `POST admins/users/:userId/files`](#6-the-admin-document-upload-moved-to-post-adminsusersuseridfiles)
  7. [Request Statuses 2, 3 and 5 are retired](#7-request-statuses-2-3-and-5-are-retired)
- [New endpoints](#new-endpoints)
  - [`POST admins/users/:userId/requests/revert`](#post-adminsusersuseridrequestsrevert)
  - [`GET admins/users/all`](#get-adminsusersall)
  - [`GET admins/users/:userId/requests/form`](#get-adminsusersuseridrequestsform)
  - [`GET admins/users/:userId/requests/exp`](#get-adminsusersuseridrequestsexp)
  - [`GET admins/files/envcard`](#get-adminsfilesenvcard)
  - [`GET admins/users/:userId/files/policeReport`](#get-adminsusersuseridfilespolicereport)
  - [`PUT users/me/photo`](#put-usersmephoto)
  - [`POST users/me/files`](#post-usersmefiles)
- [Other behaviour changes](#other-behaviour-changes)

---

## Breaking changes

### 1. `DELETE admins/users/requests/:id` removed

Issue #7. Use [`POST admins/users/:userId/requests/revert`](#post-adminsusersuseridrequestsrevert) instead.

A normal status update can no longer move a user **back** to a status that only a Revert should reach (0, 1, 6, 7 or 15):

```http
POST /envocc-card/api/v2/admins/users/requests/update
Cookie: Authentication_Admin=<token>
Content-Type: application/json

{ "user": 42, "current_status": 9, "next_status": 6, "description": "แก้เอกสาร" }
```

```json
400 Bad Request
{
  "message": "moving back to 6 is a revert: use POST admins/users/:userId/requests/revert",
  "error": "Bad Request",
  "statusCode": 400
}
```

### 2. `GET public/positions` returns an array

Issue #14. With `orgId`, it used to return only the first executive position of the organization, as an object. It now returns **every** executive position of that organization (for example both อธิบดี and รองอธิบดี, or ปลัด and รองปลัด), sorted by `position_id`. Without `orgId`, it returns the non-executive positions, as before.

```http
GET /envocc-card/api/v2/public/positions?orgId=12
```

Before:

```json
200 OK
{ "executive_id": 101, "executive_position_name": "อธิบดี" }
```

Now:

```json
200 OK
[
  { "position_id": 101, "position_name": "อธิบดี" },
  { "position_id": 102, "position_name": "รองอธิบดี" }
]
```

An organization with no executive positions returns `[]`.

### 3. Admin `positionId` is a string

Commit `fe651c0`. `admins.positionId` is free text and no longer links to the positions table.

- **`POST admins/auth/register`**: send `positionId` as a string. A number fails validation.
- **`GET admins/admins`**: the admin listing no longer includes the `position` object. Read `positionId` instead.

```http
POST /envocc-card/api/v2/admins/auth/register
Content-Type: application/json

{
  "username": "admin.dept01",
  "password": "********",
  "pname": "นาย",
  "fname": "สมชาย",
  "lname": "ใจดี",
  "private_number": "0812345678",
  "work_number": "025901234",
  "email": "somchai@example.go.th",
  "positionId": "นักวิชาการสาธารณสุขชำนาญการ",
  "positionLvId": 3,
  "orgId": 12
}
```

Sending a number:

```json
400 Bad Request
{
  "message": ["positionId must be a string"],
  "error": "Bad Request",
  "statusCode": 400
}
```

### 4. Unapproved users can log in; card-request routes need approval

Issue #1. A registered user can now log in **before** an admin approves them (`PATCH admins/users/validate/:id`). Login used to fail with `401 user not validated`.

Until they're approved, these routes return **403**:

| Method | Path |
|---|---|
| `GET` | `users/me/requests/latest` |
| `POST` | `users/me/requests` |
| `POST` | `users/me/card` |
| `POST` | `users/me/photo` |
| `PUT` | `users/me/photo` |
| `POST` | `users/me/envcard` |
| `GET` | `users/me/files/:file` |
| `PATCH` | `users/me/members/qrcode` |
| `GET` | `users/me/envcard/qrcode` |

```http
GET /envocc-card/api/v2/users/me/requests/latest
Cookie: Authentication_User=<token>
```

```json
403 Forbidden
{ "message": "user not validated", "error": "Forbidden", "statusCode": 403 }
```

These stay open to any logged-in user: `GET users/me`, `PATCH users/me`, `GET users/me/requests/form`, `GET users/me/requests/exp`, and `GET`/`POST`/`PATCH`/`DELETE users/me/experiences…`. The routes that change data among them also depend on the request status; see [Personal data only at request status 0, 1 or 6](#personal-data-only-at-request-status-0-1-or-6).

`GET users/me/requests/form` is the only route that returns the user's full profile, so an unapproved user can read what they edit with `PATCH users/me` (issue #17). Its response includes `is_validate`.

`GET users/me/requests/exp` (the experience form) is open too, so an unapproved user can open the form and see their data (issue #19). Its response includes `is_validate`; don't let the user print the form while it's `false`.

Approval is read from the database on every request. Once an admin approves a user, the user doesn't need to log in again.

Suggested frontend handling: after login, if `is_validate` in `users/me/requests/form` is `false` (`users/me` doesn't include it), show a "waiting for approval" screen instead of the card-request flow. Treat a 403 with `user not validated` the same way.

### 5. Admin file routes need an admin login

Issue #5. Every route on the admin file controller now requires the `Authentication_Admin` cookie. Before this, these two could be called without logging in:

- `GET admins/users/:userId/files/:file`
- `DELETE admins/users/:userId/files/:file`

Without the cookie:

```json
401 Unauthorized
{ "message": "Unauthorized", "statusCode": 401 }
```

### 6. The admin document upload moved to `POST admins/users/:userId/files`

`POST users/me/files` used to be the admin's upload, with the target user in a `user` field. That route now belongs to the user (see [`POST users/me/files`](#post-usersmefiles)), and an admin cookie on it answers `401`. Admins upload on behalf of a user at `POST admins/users/:userId/files`, with the user's id in the path and no `user` field. The other fields and rules are unchanged; see [Document upload by an admin](#document-upload-by-an-admin-the-request-file-is-optional).

### 7. Request Statuses 2, 3 and 5 are retired

Issue #48. The Request Status steps were redrawn: the user sends their documents and photo together at **1**, the admin checks both at **4**, and when the check fails the admin moves the user to **6**, where the user corrects their data, photo and documents and sends them again. Statuses 2 (correct photo), 3 (upload documents) and 5 (unit admin corrects documents) are no longer used.

- **`POST admins/users/requests/update`** refuses a `next_status` of 2, 3 or 5, and any number outside 0–16. The admin moves a user from 4 to 6 with this route when the check fails.

  ```json
  400 Bad Request
  {
    "message": "request status 3 is not in use",
    "error": "Bad Request",
    "statusCode": 400
  }
  ```

- **Document upload** by the user ([`POST users/me/files`](#post-usersmefiles)) starts from 1 or 6, no longer from 3. [`PUT users/me/photo`](#put-usersmephoto) works at 1 or 6, no longer at 2 or 3.
- **Status names** (`request_statuses.status_name`) changed: 1 is `อัปโหลดเอกสารและรูปถ่าย`, 4 is `ตรวจสอบเอกสารและรูปถ่าย`, and 2, 3 and 5 end in `(เลิกใช้)`. They stay in the table, so older Status History entries still resolve. Older entries at 1 show the new name.
- **Users at 2, 3 or 5** when this ships are moved by the database migration: 2 → 6, 3 → 1, 5 → 4. Each gets a new Status History entry with the same `request_type`, no `approver`, and the description `ย้ายอัตโนมัติ: เลิกใช้สถานะ 2` (or 3, or 5). Their earlier entries are kept.

---

## New endpoints

### `POST admins/users/:userId/requests/revert`

Issue #7. Sends a user's card request back to an earlier Request Status.

**Who can call it:** admins of a **DEPARTMENT** or **MINISTRY** organization, for users in their own organization or one below it.

**Allowed moves** (anything else returns 400):

| Target | From | Effect |
|---|---|---|
| **0** | 1–6 | Only for a first-card request (Request Type 1). A full restart. It deletes the user's whole status history and every uploaded file (photo, government card, experience form, request file, police report), and marks the user unapproved again. Only one status-0 entry is left. See `docs/adr/0001-revert-to-0-deletes-status-history.md`. |
| **1** | 2–14 | Deletes the files listed in `delete_files`. Clears the card's start and end dates. |
| **6** | 7–14 | Deletes the files listed in `delete_files`. Clears the card's start and end dates. |
| **7** | 8–14 | Clears the card's start and end dates. |
| **15** | 16 | Reactivates the card. |

Every Revert except a revert to 0 adds a new status-history entry, with the `request_type` of the user's current request. The user keeps their Member Number and QR code.

A request for a new card (Request Types 2–11) cannot be Reverted to 0, because the user already holds a card (`docs/adr/0003-a-request-for-a-new-card-cannot-be-ended-early.md`). When something is wrong with it, Revert it to 1, 6 or 7 and it carries on.

**Request**

| Field | Type | Required | Notes |
|---|---|---|---|
| `current_status` | number | yes | Must equal the user's latest status, or the request fails with 400 `user's status mismatched`. |
| `target_status` | number | yes | One of the targets above. |
| `delete_files` | `("photo" \| "govcard" \| "expfile")[]` | no | Used only for a revert to 1 or 6. Leave it out, or send `[]`, to keep every file. |
| `description` | string | no | Stored on the new status entry. |

```http
POST /envocc-card/api/v2/admins/users/42/requests/revert
Cookie: Authentication_Admin=<token>
Content-Type: application/json

{
  "current_status": 9,
  "target_status": 6,
  "delete_files": ["photo"],
  "description": "รูปถ่ายไม่ชัด กรุณาอัปโหลดใหม่"
}
```

**Response**: the new status entry.

```json
200 OK
{
  "id": 318,
  "userId": 42,
  "request_status": 6,
  "request_type": 1,
  "approver": 7,
  "description": "รูปถ่ายไม่ชัด กรุณาอัปโหลดใหม่",
  "date_update": "2026-10-14T03:21:45.112Z"
}
```

A revert to 0 has no `delete_files`, because it always deletes everything:

```json
{ "current_status": 4, "target_status": 0, "description": "เริ่มคำขอใหม่" }
```

**Errors**

| Status | `message` | When |
|---|---|---|
| 400 | `user's status mismatched` | `current_status` isn't the user's latest status, for example if another admin moved the user first. Reload and retry. |
| 400 | `cannot revert from 16 to 6` | The move isn't in the table above. |
| 400 | `only a first-card request (Request Type 1) can be reverted to 0` | The user's request is of types 2–11 (a card holder's new request). Revert it to 1, 6 or 7 instead. |
| 400 | an array of validation messages | The body is invalid, for example `delete_files` contains `"reqFile"`. |
| 403 | `only DEPARTMENT or MINISTRY admins can revert` | The admin's organization is a REGION, PROVINCE or UNIT. |
| 403 | `user is outside your organization` | The user isn't in the admin's organization or one below it. |
| 404 | `user not found` | |

Each Revert runs in one database transaction, so if it fails nothing changes. Files on disk are deleted only after it commits.

### `GET admins/users/all`

Issue #6. Lists users at **every** status, across **all** organizations.

**Who can call it:** admins of a **MINISTRY**-level organization. Everyone else gets 403.

**Query**

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | integer ≥ 1 | `1` | 10 users per page. |
| `search_term` | string | | Matches first name, last name or organization name (Thai). |
| `request_type` | integer 1–11 | | Keeps users whose latest Status History entry has this Request Type. See [Request Type in the admin user lists](#request-type-in-the-admin-user-lists). |

The response shape matches `GET admins/users`, with one added field, `username`. There's no `status` filter and no organization limit.

```http
GET /envocc-card/api/v2/admins/users/all?page=1&search_term=สม
Cookie: Authentication_Admin=<token>
```

```json
200 OK
{
  "data": [
    {
      "id": 42,
      "username": "somchai.j",
      "pname_th": "นาย",
      "pname_other_th": null,
      "fname_th": "สมชาย",
      "lname_th": "ใจดี",
      "members": [
        { "start_date": "2026-03-01T00:00:00.000Z", "end_date": "2031-02-28T00:00:00.000Z" }
      ],
      "start_date": "2026-03-01T00:00:00.000Z",
      "end_date": "2031-02-28T00:00:00.000Z",
      "request_status": 9,
      "request_type": 3,
      "request_type_name": "บัตรสูญหาย",
      "position": "นักวิชาการสาธารณสุข",
      "position_lv": "ชำนาญการ",
      "unit": "สำนักงานป้องกันควบคุมโรคที่ 1 เชียงใหม่",
      "department": "กรมควบคุมโรค",
      "ministry": "กระทรวงสาธารณสุข"
    },
    {
      "id": 57,
      "username": "somying.r",
      "pname_th": "นางสาว",
      "pname_other_th": null,
      "fname_th": "สมหญิง",
      "lname_th": "รักงาน",
      "members": [],
      "request_status": null,
      "request_type": null,
      "request_type_name": null,
      "position": "พยาบาลวิชาชีพ",
      "position_lv": "ปฏิบัติการ",
      "unit": "โรงพยาบาลตัวอย่าง",
      "department": null,
      "ministry": "กระทรวงสาธารณสุข"
    }
  ],
  "pageData": { "totalItems": 2, "totalPages": 1, "currentPage": 1, "limit": 10 }
}
```

- `request_status` is the user's **latest** status, or `null` if the user has no requests yet. Before this change, a user with no requests made `GET admins/users` fail with a 500; now it returns `null` there too.
- `start_date` and `end_date` are left out when the user has no card yet.

Not a ministry admin:

```json
403 Forbidden
{ "message": "admin not at ministry level", "error": "Forbidden", "statusCode": 403 }
```

### `GET admins/users/:userId/requests/form`

Lets an admin read a user's request form. The response is the same as the user's own `GET users/me/requests/form`.

**Who can call it:** any admin (admin cookie required). Any admin level works, but only for users in the admin's own organization or one below it; any other user returns 403. It works for users who aren't approved yet; check `is_validate` in the response.

```http
GET /envocc-card/api/v2/admins/users/42/requests/form
Cookie: Authentication_Admin=<token>
```

`:userId` must be an integer, otherwise 400. A user that doesn't exist returns 404. A user outside the admin's organization returns 403. A user cookie or no cookie returns 401.

```json
404 Not Found
{ "message": "user not found", "error": "Not Found", "statusCode": 404 }
```

```json
403 Forbidden
{ "message": "user is outside your organization", "error": "Forbidden", "statusCode": 403 }
```

### `GET admins/users/:userId/requests/exp`

Lets an admin read a user's experience form. The response is the same as the user's own `GET users/me/requests/exp`, including `is_validate`. The access rules and errors are the same as [`GET admins/users/:userId/requests/form`](#get-adminsusersuseridrequestsform).

```http
GET /envocc-card/api/v2/admins/users/42/requests/exp
Cookie: Authentication_Admin=<token>
```

### `GET admins/files/envcard`

Issue #5. Lists envcard file metadata, newest first.

**Who can call it:** **MOPH** admins only, meaning admins of the MINISTRY-level organization with code `15000` (กระทรวงสาธารณสุข).

**Query**

| Param | Type | Notes |
|---|---|---|
| `userId` | integer, optional | Only that user's files. Leave it out to get every user's. A value that isn't an integer returns 400. |

```http
GET /envocc-card/api/v2/admins/files/envcard?userId=42
Cookie: Authentication_Admin=<token>
```

```json
200 OK
[
  {
    "id": 88,
    "userId": 42,
    "filename": "envcard-42-1760410905112.pdf",
    "url": "assets/envcard/envcard-42-1760410905112.pdf",
    "create_date": "2026-10-14T02:41:45.112Z"
  },
  {
    "id": 61,
    "userId": 42,
    "filename": "envcard-42-1748850000000.pdf",
    "url": "assets/envcard/envcard-42-1748850000000.pdf",
    "create_date": "2026-06-02T08:20:00.000Z"
  }
]
```

No files returns `[]`.

Not a MOPH admin:

```json
403 Forbidden
{ "message": "admin is not from MOPH", "error": "Forbidden", "statusCode": 403 }
```

### `GET admins/users/:userId/files/policeReport`

Issue #57. Lets an admin read the police report (ใบแจ้งความ) a user sent for a lost-card request (Request Type 3). The response is the stored file row, like `GET admins/users/:userId/files/govcard`.

**Who can call it:** any admin (admin cookie required), but only for users in the admin's own organization or one below it. Unlike the other files under `GET admins/users/:userId/files/:file`, an admin of another organization gets 403.

```http
GET /envocc-card/api/v2/admins/users/42/files/policeReport
Cookie: Authentication_Admin=<token>
```

```json
200 OK
{
  "id": 3,
  "adminId": null,
  "filename": "policeReport-1763550000000-123456789.pdf",
  "url": "assets/policeReport-1763550000000-123456789.pdf",
  "create_date": "2026-11-19T08:20:00.000Z",
  "userId": 42
}
```

`adminId` is the admin who uploaded it for the user, or `null` when the user sent it. The user reads their own with `GET users/me/files/policeReport`.

**Errors**

| Status | `message` | When |
|---|---|---|
| 403 | `user is outside your organization` | The user is not in the admin's organization or one below it. |
| 404 | `user not found` | No user has the id `:userId`. |
| 404 | `file(s) not found` | The user has no police report. |
| 400 | `Validation failed (numeric string is expected)` | `:userId` is not an integer. |
| 401 | `Unauthorized` | No `Authentication_Admin` cookie, or a user cookie. |

### `PUT users/me/photo`

`multipart/form-data` with the `photo` field, a JPG or PNG of at most 10 MB. It needs the `Authentication_User` cookie and an approved user. It replaces the user's photo, or creates it when there is none. `POST users/me/photo` still refuses a second photo with `400 user already has file(s)`.

The photo can be replaced only while the user's current request status is **1 or 6**, that is while it is the user's turn to upload their documents (1) or correct their data (6).

```http
PUT /envocc-card/api/v2/users/me/photo
Cookie: Authentication_User=<token>
Content-Type: multipart/form-data; boundary=----X

------X
Content-Disposition: form-data; name="photo"; filename="photo.png"
Content-Type: image/png

<binary>
------X--
```

```json
200 OK
{ "msg": "photo replaced", "id": 17 }
```

`id` is the new photo's id. Deleting the old file from the server is best-effort: the replace still succeeds if that file is already gone. At any other status:

```json
403 Forbidden
{
  "message": "photo can be replaced only at request status 1 or 6",
  "error": "Forbidden",
  "statusCode": 403
}
```

An unapproved user gets `403 user not validated`, as on the other card-request routes.

**Errors**

| Status | `message` | When |
|---|---|---|
| 400 | `photo is required` | The form has no `photo` field. `POST users/me/photo` returns the same instead of a 500. |
| 400 | `unsupported file type` | The file isn't a `.jpg` or `.png`. |
| 413 | `File too large` | The file is over 10 MB. |
| 403 | `photo can be replaced only at request status 1 or 6` | The user's request status isn't 1 or 6, or they have no status history. |
| 403 | `user not validated` | The user isn't approved yet. |

### `POST users/me/files`

A user sends their own documents (Document upload). `multipart/form-data`, with the `Authentication_User` cookie and an approved user. The user is taken from the cookie.

| Field | Required | Notes |
|---|---|---|
| `govCard` | yes, unless the user already has one | PDF, at most 10 MB. |
| `experienceForm` | no | PDF, at most 10 MB. |
| `photo` | for a request for a new card (Request Types 2–11), unless the user already has one; otherwise no | JPG or PNG, at most 10 MB. When sent, it replaces the user's current photo. |
| `policeReport` | for a lost-card request (Request Type 3), unless the user already has one; otherwise no | PDF, at most 10 MB. The police report (ใบแจ้งความ). When sent, it replaces the stored one. |

The upload is allowed only while the user's current request status is **1** (first upload) or **6** (correction after a Revert). On success the user moves to status 4. A document sent again replaces the existing one; a `govCard` or `experienceForm` left out is kept. The old files are deleted from the server after the upload commits, best-effort.

```http
POST /envocc-card/api/v2/users/me/files
Cookie: Authentication_User=<token>
Content-Type: multipart/form-data; boundary=----X

------X
Content-Disposition: form-data; name="govCard"; filename="govcard.pdf"
Content-Type: application/pdf

<binary>
------X
Content-Disposition: form-data; name="experienceForm"; filename="exp.pdf"
Content-Type: application/pdf

<binary>
------X--
```

The body of a `201 Created` is empty. At any other status:

```json
403 Forbidden
{
  "message": "documents can be uploaded only at request status 1, 6",
  "error": "Forbidden",
  "statusCode": 403
}
```

**Errors**

| Status | `message` | When |
|---|---|---|
| 400 | `govcard is required` | The user has no stored government card and the form has no `govCard`. |
| 400 | `photo is required` | The request is for a new card (Request Types 2–11), the user has no stored photo and the form has no `photo`. |
| 400 | `policeReport is required` | The request is for a lost card (Request Type 3), the user has no stored police report and the form has no `policeReport`. |
| 400 | `unsupported file type` | A `govCard`, `experienceForm` or `policeReport` isn't a `.pdf`, or the `photo` isn't a `.jpg` or `.png`. |
| 400 | `Unexpected field - <field>` | The form has a field this route doesn't take, such as `requestFile`. |
| 413 | `File too large` | A file is over 10 MB. |
| 403 | `documents can be uploaded only at request status 1, 6` | The user's request status isn't 1 or 6, or they have no status history. |
| 403 | `user not validated` | The user isn't approved yet. |
| 401 | `Unauthorized` | No `Authentication_User` cookie, or an admin cookie. |

Nothing is stored when the request fails.

The stored `gov_card_files` and `exp_files` rows have no admin, so `GET users/me/files/govcard` and `GET users/me/files/expfile` (and the admin's `GET admins/users/:userId/files/:file`) return `"adminId": null` for them.

---

## Other behaviour changes

### Starting a request for a new card (`POST users/me/card`)

Issue #50. A card holder starts a request for a new card and gives the reason, the **Request Type**, as `?requestType=`:

| `requestType` | Reason |
|---|---|
| 2 | บัตรหมดอายุ (card expired) |
| 3 | บัตรสูญหาย (card lost) |
| 4 | บัตรถูกทำลาย (card destroyed) |
| 5 | เปลี่ยนชื่อตัว (first name changed) |
| 6 | เปลี่ยนชื่อสกุล (last name changed) |
| 7 | เปลี่ยนชื่อตัวและชื่อสกุล (first and last name changed) |
| 8 | เปลี่ยนคำนำหน้าชื่อตัว (name title changed) |
| 9 | เลื่อนยศหรือชั้นหรือระดับ (rank or level promoted) |
| 10 | เปลี่ยนตำแหน่ง (position changed) |
| 11 | ย้ายสังกัด (organization changed) |

Type 1 (ครั้งแรก, first card) comes only from registering. The names are in a new `request_types` table (`type_id`, `type_name`), and `requests.request_type` refers to it.

```http
POST /envocc-card/api/v2/users/me/card?requestType=9
Cookie: Authentication_User=<token>
Content-Type: application/json

{ "user": { "position_lvId": 3 } }
```

- **When:** only while the user's current request status is **15** (card issued) or **16** (card cancelled). Before, it was accepted at any status.
- **Body:** `user` (the user's details) and `experiences` (items added to the user's experiences) are both optional. They are saved in the same transaction as the new status: either the request starts and they are saved, or nothing is saved. Before, `user` was required (`400 invalid user input`) and sending `experiences` failed with 500.
- **Response:** `201` with an empty body. The user is now at status 1. The new Status History entry has the `request_type` given and no `approver` (it used to carry the user's own id in that admin field).
- **Two requests sent at once** start one request. The other answers 403.
- **Files:** issues #51 and #57. Starting the request deletes the government card and police report sent for the user's earlier request, and the photo too unless `requestType` is 2, so the user sends them again with [`POST users/me/files`](#post-usersmefiles), which then requires both (the photo only when none is stored). A type 2 request keeps the photo, because the old card stays valid until its end date and the online card shows it. The experience form, the experiences and the copy of the old issued card (`envcard`) are kept. The files are deleted only when the request starts: a refused request deletes nothing. They cannot be got back.

**Errors**

| Status | `message` | When |
|---|---|---|
| 400 | `requestType must be one of 2, 3, 4, 5, 6, 7, 8, 9, 10, 11` | `requestType` is 1, or not a Request Type (0, 12, …). |
| 400 | `Validation failed (numeric string is expected)` | `requestType` is missing or not a number. |
| 403 | `a new card can be requested only at request status 15 or 16` | The user is at any other status, or has no status history. |

Once started, the request walks the same statuses to 15 as a first-card request, and every Status History entry it adds carries its `request_type`, whichever route writes it. Before, the entries written by `POST admins/members` (signing method) and `PATCH admins/members/:userId/activate` (approval date) always had `request_type` 1.

The user keeps their Member Number and QR code: step 7 reuses their card record. `PATCH admins/members/:userId/activate` now also sets the card active (`is_active: true`), so a request started from a cancelled card (16) ends with an active card, which `GET users/me/envcard/qrcode` returns again.

### Request Type in the admin user lists

Issue #53. Admins see the Request Type of each user's current request, and can filter by it.

- Each row of `GET admins/users` and `GET admins/users/all` has two new fields, `request_type` (1–11) and `request_type_name` (its Thai name), taken from the user's **latest** Status History entry, the same entry `request_status` comes from. Both are `null` for a user with no entries.
- `GET admins/users/:userId/requests/form` and `GET users/me/requests/form` return the same two fields.
- `GET admins/users` and `GET admins/users/all` take an optional `request_type` query parameter. It keeps only users whose latest entry has that Request Type, and combines with `status`, `search_term` and `page`. `pageData` counts the filtered users. An admin still sees only users in their organization and below.

```http
GET /envocc-card/api/v2/admins/users?status=ongoing&request_type=3&page=1
Cookie: Authentication_Admin=<token>
```

A `request_type` that isn't a Request Type (for example `99`, `0` or `lost`) answers `400`:

```json
400 Bad Request
{
  "message": ["request_type must be one of the following values: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11"],
  "error": "Bad Request",
  "statusCode": 400
}
```

Without `request_type`, both lists answer as before, apart from the two new fields.

### Personal data only at request status 0, 1 or 6

Issue #49. A user changes their own details only while their current request status is **0** (registered), **1** (document upload) or **6** (data correction). This covers:

- `PATCH users/me`
- `POST users/me/experiences`
- `PATCH users/me/experiences/:expId`
- `DELETE users/me/experiences/:expId`

At any other status, or with no status history, these answer `403` and change nothing. Before, they were accepted at any status, so a card holder at 15 could change the name on their card.

```json
403 Forbidden
{
  "message": "personal data can be edited only at request status 0, 1 or 6",
  "error": "Forbidden",
  "statusCode": 403
}
```

Once a card is issued (15) or cancelled (16), the user changes their details by starting a request for a new card with [`POST users/me/card`](#starting-a-request-for-a-new-card-post-usersmecard), which saves the details in its body.

Reading stays open at every status: `GET users/me`, `GET users/me/experiences`, `GET users/me/requests/form` and `GET users/me/requests/exp`.

The experience routes also changed in these ways:

- `POST users/me/experiences` adds every item to the logged-in user. The `userId` field is no longer needed, and a `userId` that is sent is ignored.
- `PATCH` and `DELETE users/me/experiences/:expId` work only on the logged-in user's own experiences. Another user's `expId`, or one that does not exist, answers `404 experience not found`.
- A failure in these three routes now answers with its error status. Before, the error body came back with `200` or `201`.

### Uploads with no file answer 400

`POST users/me/photo`, `PUT users/me/photo` and `POST users/me/envcard` used to answer 500 when the form had no file field. They now answer 400 with `photo is required` or `envcard is required`.

### Document upload by an admin: the request file is optional

Issue #11. `POST admins/users/:userId/files` takes `multipart/form-data` and requires the admin cookie. `:userId` is the target user's id. It has no status gate: an admin may upload at any request status.

| Field | Required | Notes |
|---|---|---|
| `govCard` | yes, unless the user already has one | PDF, at most 10 MB. |
| `requestFile` | **no** (it used to be required, and leaving it out caused a 500) | PDF, at most 10 MB. |
| `experienceForm` | no | PDF, at most 10 MB. |
| `policeReport` | for a lost-card request (Request Type 3), unless the user already has one; otherwise no (issue #57) | PDF, at most 10 MB. The police report (ใบแจ้งความ). |

A type 3 request without a police report, sent or stored, answers `400` with `policeReport is required`. An admin sends no photo, so the photo a request for a new card needs is not required here.

```http
POST /envocc-card/api/v2/admins/users/42/files
Cookie: Authentication_Admin=<token>
Content-Type: multipart/form-data; boundary=----X

------X
Content-Disposition: form-data; name="govCard"; filename="govcard.pdf"
Content-Type: application/pdf

<binary>
------X--
```

On success the user moves to status 4. A file sent again replaces the existing one; files left out are kept.

If no user has the id `:userId`, the route answers `404` with `user not found` and stores nothing.

### Smaller changes

- **QR check** uses the user's **latest** status, not the highest status they ever reached. A reverted user's QR code now reflects the revert.
- **Step 7** reuses the user's existing member record instead of creating a second one, so the Member Number stays the same after a revert.
- **Admin permissions** (ministry and MOPH) and **user approval** are read from the database on every request. A change takes effect without the admin or user logging in again.
