# Security Specification — Roteiro LD

## 1. Data Invariants
1. **User Isolation**: Every `/users/{userId}` document can only be read, created, or updated by `request.auth.uid == userId` with verified email. User listing is forbidden.
2. **Project Ownership**: Every `/projects/{projectId}` document belongs strictly to `ownerId == request.auth.uid`. No user can read, list, create, update, or delete another user's project.
3. **Subcollection Master Gate**: Every subcollection (`scripts`, `frames`, `beats`, `characters`, `assets`, `chatMessages`) under `/projects/{projectId}` requires both `resource.data.ownerId == request.auth.uid` and parent project ownership `get(.../projects/{projectId}).data.ownerId == request.auth.uid` on single-doc reads/writes, and `resource.data.ownerId == request.auth.uid` on `list` queries.
4. **Immutable Ownership & Temporal Integrity**: `ownerId`, `projectId`, `id`, and `createdAt` are immutable after creation. `createdAt` and `updatedAt` must strictly equal `request.time`.
5. **Strict Key & Size Bounds**: Every write validates exact required + allowed keys via `hasAll` / `hasOnly` (on create) and `affectedKeys().hasOnly(...)` (on update), plus string `.size()` and array `.size()` limits to prevent shadow fields and payload exhaustion.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Project Create**: `{ id: "p1", ownerId: "anon", title: "Hack" }` -> Denied (`request.auth == null`).
2. **Spoofed OwnerId on Create**: Authenticated as `userA`, creating `/projects/p1` with `ownerId: "userB"` -> Denied (`incoming().ownerId == request.auth.uid`).
3. **Shadow Field Injection on Create**: Valid project payload plus `isAdmin: true` -> Denied (`hasOnly(...)`).
4. **Ghost Field Injection on Update**: Valid project update plus `role: "superadmin"` -> Denied (`affectedKeys().hasOnly(...)`).
5. **Client Timestamp Forgery**: Creating project with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> Denied (`incoming().createdAt == request.time`).
6. **Immutable Owner Transfer**: Updating `ownerId` from `userA` to `userB` -> Denied (`incoming().ownerId == existing().ownerId` and not in `affectedKeys`).
7. **ID Path Poisoning**: Creating `/projects/invalid id with spaces and $` or 200-char ID -> Denied (`isValidId()`).
8. **Orphan Subcollection Write**: Creating `/projects/nonexistent/scripts/s1` -> Denied (`exists(.../projects/nonexistent)`).
9. **Cross-Tenant Subcollection Read**: `userB` calling `get` on `/projects/userA_proj/scripts/s1` -> Denied (`isProjectOwner`).
10. **Unfiltered Collection List**: `userB` querying `collection(db, "projects")` without `where("ownerId", "==", "userB")` -> Denied (`resource.data.ownerId == request.auth.uid`).
11. **Oversized String / Denial-of-Wallet**: Creating a project with a 5,000-char `title` -> Denied (`data.title.size() <= 160`).
12. **Unverified Email Write**: Authenticated user with `email_verified: false` creating a project -> Denied (`request.auth.token.email_verified == true`).
