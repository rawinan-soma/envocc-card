# A request for a new card cannot be ended early

A user who already holds a card can start another request (Request Types 2–11: expired, lost, name changed and so on), and it walks the same Request Statuses 1–15 as a first-card request. Once started, it cannot be withdrawn, by the user or by an admin, and it cannot be Reverted to 0: a Revert to 0 is allowed only for a first-card request (Request Type 1). When something is wrong with it, an admin Reverts it to 1, 6 or 7 and it carries on until the card is issued.

We barred the Revert to 0 because it deletes the whole Status History and makes the user unapproved (ADR 0001), which for a card holder would erase the record of the card they already have. We then chose not to add a separate "withdraw" that would put the user back at 15 or 16. Starting the request deletes the photo and government card from the earlier request, so a withdraw would have to keep those files aside and restore them, and the Reverts that already exist cover a request that needs fixing.

## Consequences

A user who starts a request by mistake cannot back out: their earlier government card is already gone (and their photo too, unless the request is for an expired card), and the request has to be completed. Don't add a cancel button or reopen the Revert to 0 for these requests without revisiting this decision and how the earlier files are kept.
