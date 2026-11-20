---
name: member-number
description: TLA+ model of Member Number allocation when admins issue cards (MembersService.transactionCreateMember, POST admins/members) and when users are deleted. Use when a change touches card issuing, member_no, the members table, lockUser, user deletion or transaction isolation, or to check whether two people can get the same Member Number.
---

# Member Number model check

## What it protects

- **Property:** every card in `members` has a Member Number that no other person holds, ever, including after the first holder is deleted. A user keeps their number across Reverts and re-issues (CONTEXT.md, Member Number, plus the never-reuse decision of 2026-11-19).
- **Harm if broken:** two people carry cards with the same printed number, so the number no longer identifies a card holder.

Tests rarely catch this. It breaks only when two admins issue cards at the same moment, or after a user is deleted. The e2e tests `gives different Member Numbers to users whose cards are created at the same time` and `never gives a deleted user's Member Number to anyone else` (`test/member-issue.e2e-spec.ts`) cover one schedule each. The model covers every schedule in its bound.

## Status at the sync commit

Run on 2026-11-19 at `e8edfd9`. Every config also checks for deadlock: a state where some admin is mid-transaction and nothing can move.

| Config | Scope | Result |
|---|---|---|
| `MemberNumberSerial` | 1 admin, 3 users, ≤5 issues, no deletes | PASS (574 states) |
| `MemberNumber` | 2 admins issuing at once, 3 users, ≤4 issues, deletes allowed | PASS (11,136 states) |
| `MemberNumberReuse` | 1 admin, 3 users, ≤5 issues, deletes allowed | PASS (3,116 states) |

`check.sh all` exits 0. Any violation is a regression or a modeling error. See "Reading a result".

How numbers are given now: `member_no` defaults to `nextval('members_member_no_seq')` (migration `20261119090000_member_no_sequence`), and `transactionCreateMember` leaves it to that default. `nextval` is atomic and never goes back, so concurrent creations can't share a number and a deleted user's number is never given out again. A rolled-back creation still uses up its number, so gaps are normal.

History. Both findings were reproduced in the live app and fixed:

1. **Duplicate numbers when issued at once** (until `b8768cf`). The number was the highest + 1, read under a lock on the user's own row only. Two admins issuing for different users both read the same highest number. A live run gave 20 cards only 11 distinct numbers. `b8768cf` added an advisory lock, and `e8edfd9` replaced that with the sequence.
2. **A deleted user's number given to the next card** (until `e8edfd9`). Deleting the holder of the highest number cascaded to their `members` row, so highest + 1 gave the same number again.

Limits of the fix:

- `member_no` has no unique constraint. Only rows that take the default are guarded, so any code or import that writes `member_no` explicitly must also run `setval('members_member_no_seq', <max>+1, false)`, or the sequence will later hand out a number that row already holds.
- `startNewCard` (`src/members/cards.ts`, starting a request for a new card) adds a card record. It writes `member_no` explicitly, copying the user's own number from their latest record. That number came from the sequence, or predates it, so it is below the sequence and held only by that user. For a type whose rule has `newMemberNumber` (type 11, change of organization, in `src/request/request-types.ts`), step 7 (`memberNumberAtStep7` in `src/members/cards.ts`, under `lockUser`) replaces that copy with `nextval('members_member_no_seq')`, like a first card's number. It does so only while an older record of the user shares the number, so passing step 7 again after a Revert takes no second number. The model does not cover this path; it still treats one record per user. The e2e test `issues a card with a Member Number not used before, keeping the QR code` (`test/new-card-request.e2e-spec.ts`) covers the type 11 case against a deleted user's number.
- The migration starts the sequence after the highest number present when it runs. Numbers of users deleted before that are unknown, and each can still be given out once.

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
| `Lock`, `GiveUp` | `lockUser` in `src/request/status-history.ts` (SELECT ... FOR NO KEY UPDATE on the user's row), called at the top of `transactionCreateMember`. For a deleted user it returns no rows, and the transaction later fails on the `userId` foreign key |
| `ReadExisting`, `Write`, `Commit` | `MembersService.transactionCreateMember`, `src/members/members.service.ts` (`existedMember`, then `members.update` for a user with a card, or `members.create` without `member_no`, then the end of `$transaction`) |
| `seq` and the create branch of `Write` | `member_no Int? @default(autoincrement())` in `prisma/schema.prisma`, and the sequence in `prisma/migrations/20261119090000_member_no_sequence` |
| `Delete` | `UsersService.deleteUserById`, `src/users/users.service.ts`, plus `onDelete: Cascade` on `members.user` in `prisma/schema.prisma` |
| READ COMMITTED reads | no `isolationLevel` passed to any `$transaction` (`grep -rn isolationLevel src` is empty) |
| `member_no` not unique, so `UniqueMemberNo` relies on every writer using the default | `model members` in `prisma/schema.prisma` |

Sync commit: **`e8edfd9`**. List the changes since then:

```bash
git diff e8edfd9 -- src/members/members.service.ts src/members/admin-member.controller.ts \
  src/request/status-history.ts src/users/users.service.ts prisma/schema.prisma prisma/migrations
```

If none of the changes touch the code in the coverage table, the model still holds and you can stop. Also check for any new code that writes `members.member_no` (`grep -rn "member_no" src prisma/seed.ts`). The model assumes the column default is the only source of new numbers.

## Keeping the model true to the code

Each model action is one Prisma statement. Keep it that way. When the code changes:

1. Mirror the change in `spec/MemberNumber.tla` at the action named in the coverage table, and update the code pointer in its comment. A new statement becomes a new `pc` step. Don't merge it into an existing step, or you hide interleavings.
2. A design change changes the model too. Writing `member_no` explicitly brings back a read step before `Write` that takes the number from somewhere other than `seq`. Resetting the sequence makes `seq` go back. A unique constraint on `member_no` turns a duplicate `Commit` into a failed transaction (model it as an abort that writes nothing).
3. Run `check.sh all`. Every config must keep passing. Keep the scope (2 admins, 3 users, 4 issues) as it is, and never shrink it to get a pass.
4. When the model describes the code at the new commit, update the status table and move the sync commit forward to that commit. Do it only after reading the diff and confirming the model matches. A green run alone doesn't prove the model matches the code.

## Reading a result

- **`Deadlock reached`:** some admin waits on a lock forever. Today each path takes one lock, the user's row, so a deadlock means a new lock was added. Check the order in which locks are taken.
- **Any other violation:** turn the trace into code steps with `/statechart`. Then check each step against the code it points to. If a step can't happen in the code (wrong lock, wrong order, a read that would see a row it can't see), the model is wrong, so fix the model. If every step can happen, it's a real bug. Report the trace in the code's words, and don't weaken the invariant.
- **`MemberNumberSerial` fails:** the allocation rule itself broke, with no concurrency involved, for example the `existedMember` branch was removed and a re-issue gets a new number (`KeepsMemberNo`).
- **To confirm a finding against the real app**, use the `verify` skill. Register two admins and some users, then send pairs of `POST admins/members` calls (`{"userId":N,"signature_method":8}`) at the same moment as different actors (`&` + `wait`). Run `db.sh 'select member_no, count(*) from members group by 1 having count(*) > 1'`. For reuse, delete the holder of the highest number with `DELETE admins/users/:id`, issue a new card, and compare the numbers.

## What it does not cover

- Request Type 11 (a change of organization gets a new number, per CONTEXT.md). `memberNumberAtStep7` takes it from the sequence at step 7 (see "Limits of the fix"), outside the modeled actions.
- The Status History entry written by `addStatusEntry` in the same transaction, statuses in general, and whether issuing is allowed at the user's current status (the route checks neither).
- Rows written with an explicit `member_no` (imports, manual SQL), and numbers held by users deleted before the migration. See "Limits of the fix".
- More than 2 admins, 3 users or 4 issues. A pass covers only that bound.
- Several API instances, retries, and crashes between statements. A crash rolls back the transaction, so it has no effect here.
