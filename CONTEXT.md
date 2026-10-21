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
_Avoid_: state, stage

**Status History**:
The record of every Request Status a user has been in, with who moved them and why. Entries are only ever added, except when a Revert to 0 wipes it.
_Avoid_: request log, requests

**Revert**:
A DEPARTMENT or MINISTRY admin sending a user's card request, within their own organization, back to an earlier Request Status. Only these moves are Reverts: any status before 7 → 0; any status before 15 → 1; 7–14 → 6; 8–14 → 7; 16 → 15.
_Avoid_: rollback, undo, send back

**Revert to 0**:
A full reset: the user becomes unapproved again, and their Status History and everything uploaded for their request are deleted, as if they had just registered.

**Replace photo**:
A user swapping the photo on their card request for a new one, allowed only while their Request Status is 1, 2 or 3 (photo check, photo correction, document upload); from 4 on the photo is fixed.
_Avoid_: update photo, re-upload

**Step 3 upload**:
Sending the documents for a card request in one go, which moves the user from Request Status 1 or 3 to 4. The user sends the government card and experience form (each unless already stored) and may send a new photo. An admin may also send it for a user, at any Request Status, with the government card as the only required file.

**Member Number**:
The running number printed on a user's card. A user keeps the same Member Number across Reverts and re-issues.
_Avoid_: card number
