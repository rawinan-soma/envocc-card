---
name: member-number
description: TLA+ model of Member Number allocation when admins issue cards (MembersService.transactionCreateMember, POST admins/members) and when users are deleted. Use when a change touches card issuing, member_no, the members table, lockUser, user deletion or transaction isolation, or to check whether two people can get the same Member Number.
---

# Member Number model check

## What it protects

- **Property:** every card in `members` has a Member Number that no other person holds, and a user keeps their number across Reverts and re-issues (CONTEXT.md, Member Number).
- **Harm if broken:** two people carry cards with the same printed number, so the number no longer identifies a card holder.

Tests miss this. It breaks only when two admins issue cards at the same moment, or after a user is deleted. The e2e suite runs one request at a time.

## Status at the sync commit

Run on 2026-11-19 at `bc0c1cc`.

| Config | Scope | Result |
|---|---|---|
| `MemberNumberSerial` | 1 admin, 3 users, ≤5 issues, no deletes | PASS (703 states) |
| `MemberNumber` | 2 admins issuing at once, 3 users, ≤4 issues, deletes allowed | **VIOLATED `UniqueMemberNo`** (known finding 1) |
| `MemberNumberReuse` | 1 admin, deletes allowed | **VIOLATED `NeverReused`** (known finding 2, policy open) |

**Finding 1, duplicate numbers.** Admin A issues a card for user u1 and admin B for user u3 at the same time. Each locks only its own user row (`lockUser`). Each reads the highest `member_no` before the other commits. Both compute `latest + 1` (or 1 on an empty table), and both commit the same number. Nothing stops it: `member_no` has no unique constraint, and Postgres runs at READ COMMITTED. A live run reproduced it: 10 pairs of concurrent `POST admins/members` gave 9 duplicated numbers (20 cards, 11 distinct numbers).

**Finding 2, reuse after delete.** `DELETE admins/users/:id` cascades to the user's `members` row. When the deleted user held the highest number, the next card issued gets that number again. A live run gave the deleted user's 11 to a new user. CONTEXT.md does not say whether a deleted user's number may be reused. Ask before treating this as a bug.

Until these are fixed, `check.sh` exits 1. A change is fine when the results match the table above. Anything new (a different invariant, a new config failing, or the serial config failing) is a regression or a modeling error. See "Reading a result".

## Run it

```bash
.claude/skills/member-number/scripts/check.sh all        # all three configs, ~3 s
.claude/skills/member-number/scripts/check.sh MemberNumberSerial
```

It needs Docker. It runs TLC from TLA+ tools v1.8.0 (`tla2tools.jar`, sha256 pinned in the script, cached in `~/.cache/envocc-tla/`) on `eclipse-temurin:21-jre`. It prints each config's result and the step names of any counterexample. Full TLC output goes to `~/.local/state/envocc-member-number/<timestamp>/<config>.out`. The exit code is 0 when everything passes, 1 for a violation, and 2 when TLC could not run the spec (a parse error, or an expression TLC cannot evaluate). A 2 is a modeling error, never a result.

The pinned jar reports `TLC2 Version 2026.11.15.002146 (rev: bc1b506)`. GitHub's `v1.8.0` asset is rebuilt from time to time, so a fresh download can fail the checksum (`checksum mismatch`, exit 2). Copy the jar from a machine that has it cached. Or download the current asset, run `check.sh all` with it, and update `JAR_SHA256` only if the results match the status table.

Read every result with the pstack `/statechart` skill. For a violation, it tells the shortest path in plain words. For a pass, it charts how the system moves between states.

## Does my change touch the verified code?

Coverage record. The model mirrors these, and nothing else:

| Model part (`spec/MemberNumber.tla`) | Code |
|---|---|
| `Start` | `AdminMemberController.createMemberHandler`, `src/members/admin-member.controller.ts` (POST admins/members: no status or org check) |
| `Lock` | `lockUser` in `src/request/status-history.ts` (SELECT ... FOR NO KEY UPDATE on the user's row), called at the top of `transactionCreateMember` |
| `ReadExisting`, `ReadLatest`, `NextNo`, `Write`, `Commit` | `MembersService.transactionCreateMember`, `src/members/members.service.ts` (`existedMember`, `latestMember`, `nextMemberNo`, `members.update` / `members.create`, end of `$transaction`) |
| `Delete` | `UsersService.deleteUserById`, `src/users/users.service.ts`, plus `onDelete: Cascade` on `members.user` in `prisma/schema.prisma` |
| READ COMMITTED reads | no `isolationLevel` passed to any `$transaction` (`grep -rn isolationLevel src` is empty) |
| `member_no` not unique | `model members` in `prisma/schema.prisma` |

Sync commit: **`bc0c1cc`**. List the changes since then:

```bash
git diff bc0c1cc -- src/members/members.service.ts src/members/admin-member.controller.ts \
  src/request/status-history.ts src/users/users.service.ts prisma/schema.prisma prisma/migrations
```

If none of the changes touch the code in the coverage table, the model still holds and you can stop. Also check for any new caller that creates or updates `members.member_no` (`grep -rn "member_no" src`). The model assumes `transactionCreateMember` is the only writer.

## Keeping the model true to the code

Each model action is one Prisma statement. Keep it that way. When the code changes:

1. Mirror the change in `spec/MemberNumber.tla` at the action named in the coverage table, and update the code pointer in its comment. A new statement becomes a new `pc` step. Don't merge it into an existing step, or you hide interleavings.
2. A fix changes the model too. With a database lock or `LOCK TABLE`, the step that takes it waits like `Lock` does. A unique constraint on `member_no` turns a duplicate `Commit` into a failed transaction (model it as an abort that writes nothing). A sequence (`nextval`) makes `ReadLatest`, `NextNo` and `Write` one atomic step.
3. Run `check.sh all`. After a fix for finding 1, `MemberNumber` must pass. Keep the scope (2 admins, 3 users, 4 issues) as it is, and never shrink it to get a pass.
4. When the model describes the code at the new commit, update the status table and move the sync commit forward to that commit. Do it only after reading the diff and confirming the model matches. A green run alone doesn't prove the model matches the code.

## Reading a result

- **Violation in `MemberNumber` or `MemberNumberReuse` matching the known findings:** expected until those are fixed.
- **Any other violation:** turn the trace into code steps with `/statechart`. Then check each step against the code it points to. If a step can't happen in the code (wrong lock, wrong order, a read that would see a row it can't see), the model is wrong, so fix the model. If every step can happen, it's a real bug. Report the trace in the code's words, and don't weaken the invariant.
- **`MemberNumberSerial` fails:** the allocation rule itself broke, with no concurrency involved, for example the `existedMember` branch was removed and a re-issue gets a new number (`KeepsMemberNo`).
- **To confirm a finding against the real app**, use the `verify` skill. Register two admins and users, then send two `POST admins/members` calls (`{"userId":N,"signature_method":8}`) at the same moment as different actors (`&` + `wait`). Then run `db.sh 'select member_no, count(*) from members group by 1 having count(*) > 1'`.

## What it does not cover

- Request Type 11 (a change of organization gets a new number, per CONTEXT.md). The code always reuses the existing number and writes `requestType: 1`, so the rule isn't implemented and isn't modeled.
- The Status History entry written by `addStatusEntry` in the same transaction, statuses in general, and whether issuing is allowed at the user's current status (the route checks neither).
- `member_no` NULL rows: Postgres sorts NULLs first in `DESC`, which would make `latestMember` a NULL row. The code never writes NULL, so this is assumed away.
- More than 2 admins, 3 users or 4 issues. A pass covers only that bound.
- Several API instances, retries, and crashes between statements. A crash rolls back the transaction, so it has no effect here.
