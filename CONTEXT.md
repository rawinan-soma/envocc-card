# EnvOcc Card

Applying for, approving, printing and verifying the occupational/environmental-health credential card. Users apply; admins of an organization review and approve.

## Language

### Admins

**Ministry admin**:
An admin whose own organization is at MINISTRY level. May see every user system-wide.

**MOPH admin**:
A Ministry admin whose organization is the Ministry of Public Health (กระทรวงสาธารณสุข, organization code 15000). Admins of MOPH's departments and units are not MOPH admins.
_Avoid_: central admin, super admin

### Card request

**Request Status**:
The step a user's card request is currently at (0–16). It is whatever the most recent entry in the user's Status History says.

| Status | Whose turn | Step |
|---|---|---|
| 0 | Admin | Check the registration |
| 1 | User | Upload documents and photo |
| 4 | Admin | Check documents and photo |
| 6 | User | Correct their data |
| 7 | Admin | Choose the signing method |
| 8 | Admin | Choose the approval date |
| 9 | Admin | E. print the card |
| 10 | Admin | M. print the card |
| 11 | Admin | Choose the approval date |
| 12 | User | Upload the employee card |
| 13 | Admin | Check the card copy |
| 14 | User | Correct the employee card |
| 15 | — | Card request succeeded |
| 16 | — | Card cancelled |

Statuses 2, 3 and 5 are not used.
_Avoid_: state, stage

**Request Type**:
Why a user is asking for a card: first card (1), expired (2), lost (3), destroyed (4), first name changed (5), last name changed (6), both names changed (7), name title changed (8), rank or level promoted (9), position changed (10), organization changed (11). The type is the user's stated main reason: it does not limit or require which details they change, and the admin checking the request judges whether it fits. Type 1 comes only from registering; a user cannot pick it. A user may start a request of types 2–11 only while their Request Status is 15 (card issued) or 16 (card cancelled), with two further limits: type 2 only from 30 days before the card's end date onwards, and type 11 only from 16, so the old organization has to cancel the card first (a Ministry admin may cancel it when the old organization does not). Only the user starts it; an admin cannot start one for them. Such a request starts at Request Status 1 and goes through the same steps to 15 whatever its type. Starting it deletes the government card uploaded for the user's earlier request, and the photo too unless the type is 2, so they are sent again. Their experiences and experience form are left as they are.
_Avoid_: status (สถานะ), reason

**Old card**:
The card a user already holds when they start a request of types 2–11. For type 2 started while the card is issued (15) it stays valid until its end date. For every other type, and for any request started from a cancelled card (16), it stops being valid as soon as the request starts (for type 11 it was already cancelled).

**Approval date**:
The date an admin picks at Request Status 8 or 11. The card is valid from it for 5 years, whatever the Request Type. For a type 2 request whose Old card has not yet expired, it must be no earlier than the day after the Old card's end date, so the two cards never overlap.

**Status History**:
The record of every Request Status a user has been in, with who moved them and why. Entries are only ever added, except when a Revert to 0 wipes it.
_Avoid_: request log, requests

**Revert**:
A DEPARTMENT or MINISTRY admin sending a user's card request, within their own organization, back to an earlier Request Status. Only these moves are Reverts: any status before 7 → 0; any status before 15 → 1; 7–14 → 6; 8–14 → 7; 16 → 15.
_Avoid_: rollback, undo, send back

**Revert to 0**:
A full reset: the user becomes unapproved again, and their Status History and everything uploaded for their request are deleted, as if they had just registered. Only a first-card request (Request Type 1) can be Reverted to 0: a user who already holds a card never goes back to unapproved. A request of types 2–11 cannot be ended early either: when something is wrong with it, an admin Reverts it to 1, 6 or 7 and it carries on until the card is issued.

**Replace photo**:
A user swapping the photo on their card request for a new one, allowed only while it is the user's turn to upload or correct: Request Status 1 or 6. At any other status the photo is fixed.
_Avoid_: update photo, re-upload

**Edit personal data**:
A user changing their own details (names, name title, rank or level, position, organization and the rest of their profile), allowed only while their Request Status is 0, 1 or 6. Changes take effect as soon as they are saved. Once a card is issued, the only way to change these details is to start a new request.

**Document upload**:
Sending the documents for a card request in one go, which moves the user from Request Status 1 or 6 to 4. The user sends the government card (unless already stored) and may send an experience form and a new photo. An admin may also send it for a user, at any Request Status. For both, the government card is required unless already stored, and for a lost card (Request Type 3) the police report as well. A user sending it for a request for a new card (Request Types 2–11) must also send a photo when none is stored. A first-card user and an admin are not held to the photo: the first-card user may send it on its own, and an admin cannot send one.
_Avoid_: Step 3 upload

**Member Number**:
The running number printed on a user's card. A user keeps the same Member Number across Reverts and re-issues, except that a card issued for a change of organization (Request Type 11) gets a new one. A Member Number belongs to one person for good: it is never given to anyone else, even after its holder is deleted, so numbers can have gaps.
_Avoid_: card number
