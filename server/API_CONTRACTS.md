# Backend API Contract (V1)

## Roles and access

The supported roles are `super_admin` and `student`. Requests without a valid active session receive `401`; authenticated requests that lack the required role or permission receive `403`. Unknown records are reported as `404`.

| Surface | Access contract |
|---|---|
| `/api/auth/login`, `/google`, `/student-register` | Public authentication endpoints; account creation only creates students |
| `/api/auth/me`, `/logout` | Any active authenticated session; returns/revokes only the current account/session |
| `/api/student/*` | Student only; profile, dashboard, activity, and notifications are scoped to the authenticated student |
| `/api/admin/*` | Super admin only; user management targets student accounts, not other super-admin accounts |
| `/api/coding/*`, `/api/verilog/*`, `/api/contests/*` | Authenticated users; submission histories and individual submission reads are scoped to the authenticated user |
| `/api/lab/*`, `/api/daily-challenge/*`, `/api/engineering/lab-*` | Super admins may manage/preview; students require `can_use_lab: true` |
| `/api/engineering/{tree,branches,subjects,topics}` | Authenticated reads; super-admin writes |

The legacy `organizations` model and `org_id` fields remain for existing-account compatibility and do not imply V1 organization-management APIs or roles.

## Admin users

`GET /api/admin/users` accepts only `search` (up to 100 characters), `status` (`active`, `inactive`, or `suspended`), `page` (positive integer), and `limit` (integer 1–100; default 20). It returns `{ users, total, page, pages }` and exposes only the student-list fields required by the admin UI.

`POST /api/admin/users` accepts only `name`, `email`, `password`, `student_id`, and optional string-or-null `department`, `batch`, `section`, and `phone`; the first four are required. `role`, `org_id`, and all other fields are rejected. Bulk import accepts only `{ "rows": [...] }`, creates students only, and reports unsupported row fields as row errors. Password policy and unique email/student ID constraints are enforced. `PUT /api/admin/users/:id` accepts only profile fields and status; password reset accepts exactly `{ "password": "..." }`. Permission updates accept exactly `{ "can_use_lab": boolean }`.

User reset, suspend, force-logout, permission, unflag, update, and delete actions return `404` for non-student accounts so these student-management operations cannot mutate super-admin accounts.

## Super-admin reporting

`GET /api/admin/stats` is restricted to super admins and returns aggregate counts computed from the `users` table for `role = student`: total, active, inactive, suspended, lab-enabled, and flagged account counts, plus `generatedAt` (an ISO-8601 server timestamp). The response contains no student records or identifiers. This endpoint does not report code execution, quiz performance, contests, or platform/service health; those sources are not unified or validated for V1. Counts are live database aggregates, not historical snapshots.

## Lab permission

`can_use_lab` is read from the current user record on every authenticated request; it is not trusted from the JWT. A student without access receives:

```json
{
  "message": "Lab access is not enabled for this account",
  "code": "LAB_ACCESS_REQUIRED"
}
```

Super admins bypass this student feature gate for administration and preview. Toggling access takes effect on the next request.

## Objective-bank practice attempts

`GET /api/engineering/lab-banks/:id` and `GET /api/engineering/lab-banks/:id/questions` expose only published objective banks to students. Student question payloads contain the prompt and option IDs/text, never `is_correct`, fill-blank answers, explanations, test cases, or solution data. Student type filters accept only `mcq_single`, `mcq_multi`, `true_false`, and `fill_blank`.

`POST /api/engineering/lab-banks/:id/submit` is student-only and accepts:

```json
{
  "question_ids": ["question-id"],
  "answers": { "question-id": "option-id" },
  "elapsed_seconds": 42
}
```

`answers` values are option IDs for single/true-false, arrays of option IDs for multi-select, and strings (up to 500 characters) for fill-blank. Missing answers are graded as incorrect. Question IDs must be unique and belong to the requested bank; selected option IDs must belong to their question. The API rejects client-supplied score fields and calculates score/max score itself. The response includes the attempt summary and answer review; answer keys/explanations are disclosed only after submission. Attempts are recorded in the existing audit/activity table. The client timer is practice UX only; timed/high-stakes assessments are not part of this contract.

## Retired client API methods

The V1 client no longer advertises organization CRUD/sharing, dynamic roles, audit browsing, unimplemented global-bank administration, or placeholder group lookup through `adminApi`. No corresponding server routes are mounted. These calls are unsupported and must not be treated as successful empty-result APIs.

## Stability requirements

- Student-facing execution results continue to use the shared public-result sanitizer.
- Student submission reads are owner-scoped; privileged administrative reads must be explicit routes and role-guarded.
- New routes must be added to both this role/permission matrix and the corresponding contract tests.
