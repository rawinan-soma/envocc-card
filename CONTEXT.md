# EnvOcc Card

Applying for, approving, printing and verifying the occupational/environmental-health credential card. Users apply; admins of an organization review and approve.

## Language

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

**Member Number**:
The running number printed on a user's card. A user keeps the same Member Number across Reverts and re-issues.
_Avoid_: card number
