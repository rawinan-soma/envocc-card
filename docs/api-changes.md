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
- [New endpoints](#new-endpoints)
  - [`POST admins/users/:userId/requests/revert`](#post-adminsusersuseridrequestsrevert)
  - [`GET admins/users/all`](#get-adminsusersall)
  - [`GET admins/files/envcard`](#get-adminsfilesenvcard)
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

These stay open to any logged-in user: `GET users/me`, `PATCH users/me`, `GET users/me/requests/form`, `GET users/me/requests/exp`, and `GET`/`POST`/`PATCH`/`DELETE users/me/experiences…`.

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

`POST users/me/files` used to be the admin's upload, with the target user in a `user` field. That route now belongs to the user (see [`POST users/me/files`](#post-usersmefiles)), and an admin cookie on it answers `401`. Admins upload on behalf of a user at `POST admins/users/:userId/files`, with the user's id in the path and no `user` field. The other fields and rules are unchanged; see [Step 3 upload](#step-3-upload-the-request-file-is-optional).

---

## New endpoints

### `POST admins/users/:userId/requests/revert`

Issue #7. Sends a user's card request back to an earlier Request Status.

**Who can call it:** admins of a **DEPARTMENT** or **MINISTRY** organization, for users in their own organization or one below it.

**Allowed moves** (anything else returns 400):

| Target | From | Effect |
|---|---|---|
| **0** | 1–6 | A full restart. It deletes the user's whole status history and every uploaded file (photo, government card, experience form, request file), and marks the user unapproved again. Only one status-0 entry is left. See `docs/adr/0001-revert-to-0-deletes-status-history.md`. |
| **1** | 2–14 | Deletes the files listed in `delete_files`. Clears the card's start and end dates. |
| **6** | 7–14 | Deletes the files listed in `delete_files`. Clears the card's start and end dates. |
| **7** | 8–14 | Clears the card's start and end dates. |
| **15** | 16 | Reactivates the card. |

Every Revert except a revert to 0 adds a new status-history entry. The user keeps their Member Number and QR code.

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

The response shape matches `GET admins/users`, but there's no `status` filter and no organization limit.

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
      "position": "นักวิชาการสาธารณสุข",
      "position_lv": "ชำนาญการ",
      "unit": "สำนักงานป้องกันควบคุมโรคที่ 1 เชียงใหม่",
      "department": "กรมควบคุมโรค",
      "ministry": "กระทรวงสาธารณสุข"
    },
    {
      "id": 57,
      "pname_th": "นางสาว",
      "pname_other_th": null,
      "fname_th": "สมหญิง",
      "lname_th": "รักงาน",
      "members": [],
      "request_status": null,
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

### `PUT users/me/photo`

`multipart/form-data` with the `photo` field, a JPG or PNG of at most 10 MB. It needs the `Authentication_User` cookie and an approved user. It replaces the user's photo, or creates it when there is none. `POST users/me/photo` still refuses a second photo with `400 user already has file(s)`.

The photo can be replaced only while the user's current request status is **1, 2 or 3**, that is while the photo is being checked (1) or corrected (2), or the documents are still being uploaded (3).

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
  "message": "photo can be replaced only at request status 1, 2 or 3",
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
| 403 | `photo can be replaced only at request status 1, 2 or 3` | The user's request status isn't 1, 2 or 3, or they have no status history. |
| 403 | `user not validated` | The user isn't approved yet. |

### `POST users/me/files`

A user uploads their own step 3 documents. `multipart/form-data`, with the `Authentication_User` cookie and an approved user. The user is taken from the cookie.

| Field | Required | Notes |
|---|---|---|
| `govCard` | yes, unless the user already has one | PDF, at most 10 MB. |
| `experienceForm` | yes, unless the user already has one | PDF, at most 10 MB. |
| `photo` | no | JPG or PNG, at most 10 MB. When sent, it replaces the user's current photo. |

The upload is allowed only while the user's current request status is **1 or 3**. On success the user moves to status 4. A document sent again replaces the existing one; a `govCard` or `experienceForm` left out is kept. The old files are deleted from the server after the upload commits, best-effort.

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
  "message": "documents can be uploaded only at request status 1, 3",
  "error": "Forbidden",
  "statusCode": 403
}
```

**Errors**

| Status | `message` | When |
|---|---|---|
| 400 | `govcard is required` | The user has no stored government card and the form has no `govCard`. |
| 400 | `expfile is required` | The user has no stored experience form and the form has no `experienceForm`. |
| 400 | `unsupported file type` | A `govCard` or `experienceForm` isn't a `.pdf`, or the `photo` isn't a `.jpg` or `.png`. |
| 400 | `Unexpected field - <field>` | The form has a field this route doesn't take, such as `requestFile`. |
| 413 | `File too large` | A file is over 10 MB. |
| 403 | `documents can be uploaded only at request status 1, 3` | The user's request status isn't 1 or 3, or they have no status history. |
| 403 | `user not validated` | The user isn't approved yet. |
| 401 | `Unauthorized` | No `Authentication_User` cookie, or an admin cookie. |

Nothing is stored when the request fails.

The stored `gov_card_files` and `exp_files` rows have no admin, so `GET users/me/files/govcard` and `GET users/me/files/expfile` (and the admin's `GET admins/users/:userId/files/:file`) return `"adminId": null` for them.

---

## Other behaviour changes

### Uploads with no file answer 400

`POST users/me/photo`, `PUT users/me/photo` and `POST users/me/envcard` used to answer 500 when the form had no file field. They now answer 400 with `photo is required` or `envcard is required`.

### Step 3 upload: the request file is optional

Issue #11. `POST admins/users/:userId/files` takes `multipart/form-data` and requires the admin cookie. `:userId` is the target user's id. It has no status gate: an admin may upload at any request status.

| Field | Required | Notes |
|---|---|---|
| `govCard` | yes, unless the user already has one | PDF, at most 10 MB. |
| `requestFile` | **no** (it used to be required, and leaving it out caused a 500) | PDF, at most 10 MB. |
| `experienceForm` | no | PDF, at most 10 MB. |

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
