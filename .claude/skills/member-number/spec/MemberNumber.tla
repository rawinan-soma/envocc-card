---------------------------- MODULE MemberNumber ----------------------------
(***************************************************************************)
(* Member Number allocation when admins issue cards.                       *)
(*                                                                         *)
(* Models MembersService.transactionCreateMember                           *)
(* (src/members/members.service.ts), reached via POST admins/members, and  *)
(* UsersService.deleteUserById (src/users/users.service.ts), reached via   *)
(* DELETE admins/users/:id. Each Prisma statement is one atomic step. The  *)
(* database is Postgres at its default isolation, READ COMMITTED: each     *)
(* statement sees only rows committed before it starts, plus the           *)
(* transaction's own writes.                                               *)
(*                                                                         *)
(* Only the members table is modelled. The Status History entry that       *)
(* addStatusEntry writes in the same transaction does not touch members,   *)
(* so it is left out. The interleavings around it are still explored.      *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets

CONSTANTS
    Users,      \* user ids that can be issued a card
    Admins,     \* concurrent admin sessions, each issuing one card at a time
    MaxIssues,  \* bound on POST admins/members calls in one behaviour
    AllowDelete,\* TRUE: DELETE admins/users/:id may run between issues
    None        \* model value for "no row" / "nobody"

VARIABLES
    members,  \* committed members rows: set of [user |-> u, no |-> n]
    issued,   \* every <<user, member_no>> ever committed (history variable)
    alive,    \* users not deleted
    lockOf,   \* users row lock: lockOf[u] is the admin holding it, or None
    pc,       \* each admin's next statement
    target,   \* the user an admin is issuing for
    existed,  \* result of the existedMember read: a row or None
    latest,   \* result of the latestMember read: a row or None
    pending,  \* the admin's uncommitted members write: a row or None
    calls     \* POST admins/members calls started so far

vars == <<members, issued, alive, lockOf, pc, target, existed, latest, pending, calls>>

Row == [user : Users, no : Nat]

RowsOf(u) == {r \in members : r.user = u}

\* tx.members.findFirst({ where: { userId } }), members.service.ts:411.
\* Any matching row: the per-user lock keeps at most one per user.
FindExisting(u) == IF RowsOf(u) = {} THEN None ELSE CHOOSE r \in RowsOf(u) : TRUE

\* tx.members.findFirst({ orderBy: { member_no: 'desc' } }), members.service.ts:415.
\* member_no is never NULL here (the code always writes a number), so the
\* DESC/NULLS FIRST ordering of Postgres does not come into play.
FindLatest == IF members = {} THEN None
              ELSE CHOOSE r \in members : \A s \in members : s.no <= r.no

\* The nextMemberNo branches, members.service.ts:419-426.
NextNo(ex, la) ==
    IF la = None THEN 1
    ELSE IF ex # None THEN ex.no
    ELSE la.no + 1

Init ==
    /\ members = {}
    /\ issued = {}
    /\ alive = Users
    /\ lockOf = [u \in Users |-> None]
    /\ pc = [a \in Admins |-> "idle"]
    /\ target = [a \in Admins |-> None]
    /\ existed = [a \in Admins |-> None]
    /\ latest = [a \in Admins |-> None]
    /\ pending = [a \in Admins |-> None]
    /\ calls = 0

\* POST admins/members with a userId. The route checks neither status nor org.
Start(a) ==
    /\ pc[a] = "idle"
    /\ calls < MaxIssues
    /\ \E u \in alive :
        /\ target' = [target EXCEPT ![a] = u]
        /\ pc' = [pc EXCEPT ![a] = "lock"]
    /\ calls' = calls + 1
    /\ UNCHANGED <<members, issued, alive, lockOf, existed, latest, pending>>

\* lockUser(tx, userId): SELECT ... FOR NO KEY UPDATE, members.service.ts:402.
\* Waits while another transaction holds the user's row.
Lock(a) ==
    /\ pc[a] = "lock"
    /\ lockOf[target[a]] = None
    /\ lockOf' = [lockOf EXCEPT ![target[a]] = a]
    /\ pc' = [pc EXCEPT ![a] = "existed"]
    /\ UNCHANGED <<members, issued, alive, target, existed, latest, pending, calls>>

ReadExisting(a) ==
    /\ pc[a] = "existed"
    /\ existed' = [existed EXCEPT ![a] = FindExisting(target[a])]
    /\ pc' = [pc EXCEPT ![a] = "latest"]
    /\ UNCHANGED <<members, issued, alive, lockOf, target, latest, pending, calls>>

ReadLatest(a) ==
    /\ pc[a] = "latest"
    /\ latest' = [latest EXCEPT ![a] = FindLatest]
    /\ pc' = [pc EXCEPT ![a] = "write"]
    /\ UNCHANGED <<members, issued, alive, lockOf, target, existed, pending, calls>>

\* tx.members.update (members.service.ts:438) keeps the row and its number.
\* tx.members.create (members.service.ts:445) adds a row with nextMemberNo.
Write(a) ==
    /\ pc[a] = "write"
    /\ pending' = [pending EXCEPT ![a] =
            [user |-> target[a], no |-> NextNo(existed[a], latest[a])]]
    /\ pc' = [pc EXCEPT ![a] = "commit"]
    /\ UNCHANGED <<members, issued, alive, lockOf, target, existed, latest, calls>>

\* The interactive transaction commits: the row becomes visible and the
\* users row lock is released.
Commit(a) ==
    /\ pc[a] = "commit"
    /\ LET r == pending[a] IN
        /\ members' = IF existed[a] # None
                        THEN (members \ {existed[a]}) \cup {r}
                        ELSE members \cup {r}
        /\ issued' = issued \cup {<<r.user, r.no>>}
    /\ lockOf' = [lockOf EXCEPT ![target[a]] = None]
    /\ pc' = [pc EXCEPT ![a] = "idle"]
    /\ pending' = [pending EXCEPT ![a] = None]
    /\ target' = [target EXCEPT ![a] = None]
    /\ existed' = [existed EXCEPT ![a] = None]
    /\ latest' = [latest EXCEPT ![a] = None]
    /\ UNCHANGED <<alive, calls>>

\* prisma.users.delete, users.service.ts:514: one statement, its own
\* transaction. Its row lock conflicts with lockUser, so it waits for an
\* issuing transaction on the same user. onDelete: Cascade removes the
\* user's members rows.
Delete(u) ==
    /\ AllowDelete
    /\ u \in alive
    /\ lockOf[u] = None
    /\ alive' = alive \ {u}
    /\ members' = members \ RowsOf(u)
    /\ UNCHANGED <<issued, lockOf, pc, target, existed, latest, pending, calls>>

\* The issuing transaction's user can be deleted only while it waits for
\* the lock; it then fails (no users row), modelled as giving up.
GiveUp(a) ==
    /\ pc[a] = "lock"
    /\ target[a] \notin alive
    /\ pc' = [pc EXCEPT ![a] = "idle"]
    /\ target' = [target EXCEPT ![a] = None]
    /\ UNCHANGED <<members, issued, alive, lockOf, existed, latest, pending, calls>>

Next ==
    \/ \E a \in Admins :
        Start(a) \/ Lock(a) \/ ReadExisting(a) \/ ReadLatest(a)
        \/ Write(a) \/ Commit(a) \/ GiveUp(a)
    \/ \E u \in Users : Delete(u)

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
(* Properties. CONTEXT.md, Member Number: "The running number printed on  *)
(* a user's card. A user keeps the same Member Number across Reverts and   *)
(* re-issues" (Request Type 11 is the exception, and it is not             *)
(* implemented in this code path).                                         *)

TypeOK ==
    /\ members \subseteq Row
    /\ \A a \in Admins : pending[a] = None \/ pending[a] \in Row

\* No two people hold cards with the same Member Number.
UniqueMemberNo ==
    \A r, s \in members : r.user # s.user => r.no # s.no

\* A user has at most one card record.
OneRecordPerUser ==
    \A r, s \in members : r.user = s.user => r = s

\* A user's Member Number never changes once given.
KeepsMemberNo ==
    \A e, f \in issued : e[1] = f[1] => e[2] = f[2]

\* A Member Number is never given to a second person, even after the first
\* is deleted. Checked separately (MemberNumberReuse.cfg): CONTEXT.md does
\* not say whether a deleted user's number may be reused.
NeverReused ==
    \A e, f \in issued : e[1] # f[1] => e[2] # f[2]
=============================================================================
