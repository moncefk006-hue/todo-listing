# Security Spec

## Data Invariants
1. A Task must belong to the user who created it (`userId == request.auth.uid`).
2. A UserStats doc must matched the authenticated user's ID (`userId == document Id`).
3. UserStats updates must only touch expected gamification fields.

## The Dirty Dozen Payloads
1. Create task with someone else's userId.
2. Edit a task you don't own.
3. Overwrite task createdAt timestamp on update.
4. Set difficulty to invalid enum value.
5. Create task with missing mandatory fields.
6. Create task with an extra ghost field `isAdmin: true`.
...

