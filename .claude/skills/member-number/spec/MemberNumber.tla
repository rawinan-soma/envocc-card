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
    seq,      \* members_member_no_seq: the value nextval returns next
    pc,       \* each admin's next statement
    target,   \* the user an admin is issuing for
    existed,  \* result of the existedMember read: a row or None
    pending,  \* the admin's uncommitted members write: a row or None
    calls     \* POST admins/members calls started so far

vars == <<members, issued, alive, lockOf, seq, pc, target, existed, pending, calls>>

Row == [user : Users, no : Nat]

RowsOf(u) == {r \in members : r.user = u}

\* tx.members.findFirst({ where: { userId } }), members.service.ts:411.
\* Any matching row: the per-user lock keeps at most one per user.
FindExisting(u) == IF RowsOf(u) = {} THEN None ELSE CHOOSE r \in RowsOf(u) : TRUE

Init ==
    /\ members = {}
    /\ issued = {}
    /\ alive = Users
    /\ lockOf = [u \in Users |-> None]
    /\ seq = 1
    /\ pc = [a \in Admins |-> "idle"]
    /\ target = [a \in Admins |-> None]
    /\ existed = [a \in Admins |-> None]
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
    /\ UNCHANGED <<members, issued, alive, lockOf, seq, existed, pending>>

\* lockUser(tx, userId): SELECT ... FOR NO KEY UPDATE, members.service.ts:402.
\* Waits while another transaction holds the user's row. A deleted user has
\* no row to lock: see GiveUp.
Lock(a) ==
    /\ pc[a] = "lock"
    /\ target[a] \in alive
    /\ lockOf[target[a]] = None
    /\ lockOf' = [lockOf EXCEPT ![target[a]] = a]
    /\ pc' = [pc EXCEPT ![a] = "existed"]
    /\ UNCHANGED <<members, issued, alive, seq, target, existed, pending, calls>>

ReadExisting(a) ==
    /\ pc[a] = "existed"
    /\ existed' = [existed EXCEPT ![a] = FindExisting(target[a])]
    /\ pc' = [pc EXCEPT ![a] = "write"]
    /\ UNCHANGED <<members, issued, alive, lockOf, seq, target, pending, calls>>

\* tx.members.update (members.service.ts:425) keeps the row and its number.
\* tx.members.create (members.service.ts:435) leaves member_no to its default,
\* nextval('members_member_no_seq'): one atomic step that no other
\* transaction can see half-done, and that a rollback does not undo.
Write(a) ==
    /\ pc[a] = "write"
    /\ IF existed[a] # None
        THEN /\ pending' = [pending EXCEPT ![a] = existed[a]]
             /\ seq' = seq
        ELSE /\ pending' = [pending EXCEPT ![a] = [user |-> target[a], no |-> seq]]
             /\ seq' = seq + 1
    /\ pc' = [pc EXCEPT ![a] = "commit"]
    /\ UNCHANGED <<members, issued, alive, lockOf, target, existed, calls>>

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
    /\ UNCHANGED <<alive, seq, calls>>

\* prisma.users.delete, users.service.ts:514: one statement, its own
\* transaction. Its row lock conflicts with lockUser, so it waits for an
\* issuing transaction on the same user. onDelete: Cascade removes the
\* user's members rows. The sequence is untouched.
Delete(u) ==
    /\ AllowDelete
    /\ u \in alive
    /\ lockOf[u] = None
    /\ alive' = alive \ {u}
    /\ members' = members \ RowsOf(u)
    /\ UNCHANGED <<issued, lockOf, seq, pc, target, existed, pending, calls>>

\* The issuing transaction's user can be deleted only before it holds the
\* user's row (Delete waits for the lock). lockUser then returns no rows and
\* the code carries on, but addStatusEntry's requests.create fails on the
\* userId foreign key and the whole transaction rolls back: nothing written.
GiveUp(a) ==
    /\ pc[a] = "lock"
    /\ target[a] \notin alive
    /\ pc' = [pc EXCEPT ![a] = "idle"]
    /\ target' = [target EXCEPT ![a] = None]
    /\ UNCHANGED <<members, issued, alive, lockOf, seq, existed, pending, calls>>

\* Every admin is idle: the behaviour may end here. Any other state with no
\* enabled step is a deadlock, which TLC reports (locks waiting in a cycle).
Done ==
    /\ \A a \in Admins : pc[a] = "idle"
    /\ UNCHANGED vars

Next ==
    \/ \E a \in Admins :
        Start(a) \/ Lock(a) \/ ReadExisting(a) \/ Write(a) \/ Commit(a) \/ GiveUp(a)
    \/ \E u \in Users : Delete(u)
    \/ Done

Spec == Init /\ [][Next]_vars

-----------------------------------------------------------------------------
(* Properties. CONTEXT.md, Member Number: "The running number printed on  *)
(* a user's card. A user keeps the same Member Number across Reverts and   *)
(* re-issues" (Request Type 11 is the exception, and it is not             *)
(* implemented in this code path). A deleted user's number is never given  *)
(* to anyone else (decided 2026-11-19).                                    *)

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
\* is deleted.
NeverReused ==
    \A e, f \in issued : e[1] # f[1] => e[2] # f[2]
=============================================================================
