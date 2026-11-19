# Accounts

Users and admins register themselves without logging in, then log in with username and password. Login sets httpOnly cookies (`Authentication_User`/`Refresh_User` or `Authentication_Admin`/`Refresh_Admin`), and every later call carries them. Admins are usable as soon as they register. Users must also be approved before most user routes open (see [approve-registration.md](./approve-registration.md)).

## Sub-features

- `acct-admin-register` registers an admin into an organization, and the admin can log in right away.
- `acct-user-register` registers a user with experiences (a regular user) or without (an executive), which creates Request Status 0, Request Type 1.
- `acct-login` logs a user or admin in and sets the cookies. A wrong password returns 401.
- `acct-me` reads the caller's own profile: `GET users/me`, `GET admins/me`.
- `acct-refresh` issues a new access cookie from the refresh cookie.
- `acct-logout` clears the cookies, and the next authenticated call returns 401.

## How to get to it (user POV)

- Admin: `POST admins/auth/register`, then `POST admins/auth/login`.
- User: `POST users/auth/register`, then `POST users/auth/login`.
- Both: `POST .../auth/refresh` and `POST .../auth/logout`.

## Driving it with api.sh

Preconditions:

- Baseline stack, `doctor.sh` passes. The usernames below are unused (a fresh run guarantees it).

- **Register a department admin (org 4).** Run `$S/api.sh anon POST admins/auth/register -H 'Content-Type: application/json' -d '{"username":"verify.admin","password":"Verify@Pass1234","pname":"นาย","fname":"ผู้ดูแล","lname":"ทดสอบ","private_number":"0812345678","work_number":"021234567","email":"verify.admin@example.com","positionId":"นักวิชาการสาธารณสุข","positionLvId":2,"orgId":4}'`. HTTP 201 with `{"msg":"admin create","admin":{"username":"verify.admin","role":"admin"}}`.
- **Register a MOPH admin (org 1).** Run the same call with `"username":"verify.moph"`, `"email":"verify.moph@example.com"` and `"orgId":1`. HTTP 201.
- **Admin login.** Run `$S/api.sh admin POST admins/auth/login -H 'Content-Type: application/json' -d '{"username":"verify.admin","password":"Verify@Pass1234"}'`. HTTP 200 with `"role":"admin","level":"DEPARTMENT"` and the admin `id`. For the MOPH admin, use actor `moph`. The response shows `"level":"MINISTRY"`.
- **Register a user (org 4).** Run `$S/api.sh anon POST users/auth/register -H 'Content-Type: application/json' -d '{"user":{"cid":"1234567890123","username":"verify.user","password":"Verify@Pass1234","pname_th":"นาย","pname_other_th":"","fname_th":"ทดสอบ","lname_th":"ระบบ","pname_en":"Mr.","pname_other_en":"","fname_en":"Test","lname_en":"System","birthday":"1990-01-31","nationality":"ไทย","blood":"O","work_number":"021234567","private_number":"0812345678","email":"verify.user@example.com","house_number1":"1","moo1":1,"alley1":"","road1":"","province1":10,"amphures1":1001,"district1":100101,"zip_code1":10200,"house_number2":"1","moo2":1,"alley2":"","road2":"","province2":10,"amphures2":1001,"district2":100101,"zip_code2":10200,"positionId":201,"position_lvId":2,"orgId":4},"experiences":[{"exp_fdate":"2020-01-01","exp_ldate":"2023-12-31","exp_typeoffice":1,"exp_office":"โรงพยาบาลตัวอย่าง","exp_position":"นักวิชาการสาธารณสุข","exp_work":"งานอาชีวอนามัย"}]}'`. HTTP 201 with `{"msg":"user created"}`.
- **Confirm the new request.** Run `$S/db.sh 'select u.id, u.username, u.is_validate, r.request_status, r.request_type from users u join requests r on r."userId"=u.id'`. One row shows `is_validate` = `f`, status `0` and type `1`.
- **User login.** Run `$S/api.sh user POST users/auth/login -H 'Content-Type: application/json' -d '{"username":"verify.user","password":"Verify@Pass1234"}'`. HTTP 200 with `{"msg":"login succesful"}`.
- **Read me.** Run `$S/api.sh user GET users/me` and `$S/api.sh admin GET admins/me`. Both return HTTP 200. The user's response is `{"id":…,"username":"verify.user","org":4,"level":"DEPARTMENT","executive":"non-executive"}`, and the admin's response carries the registered names and contact numbers.
- **Logout.** Run `$S/api.sh user POST users/auth/logout`, then `$S/api.sh user GET users/me`. The logout returns HTTP 200, and the read after it returns HTTP 401.

## Gotchas

- `bruno/User auth/Register.bru` is stale. Its body has no address fields (`house_number1`... `zip_code2`), so the API returns 400 for it. Use the body above.
- User passwords must be 12-20 chars with upper, lower, digit and one of `@#$&*`. Admin passwords are not checked.
- `work_number` is 9 digits for admins (`^0[0-9]{8}$`), while `private_number` is 10.
- The admin register `positionId` is free text (a position name), but the user register `positionId` is a positions id.
- The registration response carries no user id. Get it from the admin user list ([admin-user-routes.md](./admin-user-routes.md)) or from `db.sh`.
- Registering the same username or email twice returns 400 `username or email alredy exists` (sic).
