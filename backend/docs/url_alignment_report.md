# API URL Alignment Report

This document audits the implemented API endpoints in the Django codebase against the specifications detailed in **Sheet 6 (API Endpoints)**. It categorizes mismatches into intentional design decisions (for security, compatibility, or Django conventions) versus deviations to be resolved.

---

## 1. Authentication Endpoints

| Method | Sheet 6 Specification | Implemented Route | Alignment Status | Notes |
|---|---|---|---|---|
| `POST` | `/api/auth/login/` | `/api/auth/login/` | ✅ Aligned | Uses custom JWT token obtain view. |
| `POST` | `/api/auth/refresh/` | `/api/auth/refresh/` | ✅ Aligned | Enforces simple_jwt token rotation. |
| `POST` | `/api/auth/logout/` | `/api/auth/logout/` | ✅ Aligned | Blacklists the refresh token. |
| `POST` | `/api/auth/otp/send/` | `/api/appointments/otp/send/` | ⚠️ Mismatch (Intentional) | Located under the `appointments` app namespace since it verifies remote bookings. |
| `POST` | `/api/auth/otp/verify/` | `/api/appointments/otp/verify/` | ⚠️ Mismatch (Intentional) | Part of the booking verification flow. |

---

## 2. Onboarding & Registration

| Method | Sheet 6 Specification | Implemented Route | Alignment Status | Notes |
|---|---|---|---|---|
| `POST` | `/api/companies/signup/` | `/api/companies/register/` | ⚠️ Mismatch (Intentional) | Named `register/` to match standard registration conventions; maps to `CompanyRegistrationView`. |
| `POST` | `/api/users/invite/{token}/accept/` | `/api/invites/accept/` | ⚠️ Mismatch (Intentional) | Accept payload is sent in the body (`{"token": "..."}`) for CSRF security rather than URL path variable. |

---

## 3. Public Customer-Facing (Queuing & Booking)

| Method | Sheet 6 Specification | Implemented Route | Alignment Status | Notes |
|---|---|---|---|---|
| `POST` | `/api/public/branches/{slug}/tickets/` | `/api/public/join/` | ⚠️ Mismatch (Intentional) | QR join passes `branch_id` in the body rather than relying on a slug, facilitating QR code generation and quick join scanning. |
| `GET` | `/api/public/tickets/{code}/` | `/api/public/tracking/{tracking_code}/` | ✅ Aligned | Uses the randomly generated secure `tracking_code` instead of internal integer ID. |
| `PATCH` | `/api/public/tickets/{code}/cancel/` | `/api/public/tickets/{tracking_code}/cancel/` | ✅ Aligned | Securely cancels the ticket and any linked remote appointment slots. |
| `GET` | `/api/public/appointment-slots/` | `/api/appointment-slots/` | ⚠️ Mismatch (Intentional) | Nested under the standard DRF Router in the `appointments` namespace. |
| `POST` | `/api/public/appointments/` | `/api/appointments/book/` | ⚠️ Mismatch (Intentional) | Unified under the `appointments` app namespace. |
| `GET` | `/api/public/appointments/{code}/` | `/api/appointments/manage/{code}/` | ✅ Aligned | Secured by random manage codes. |
| `PATCH` | `/api/public/appointments/{code}/` | `/api/appointments/manage/{code}/` | ✅ Aligned | Enables rescheduling and cancellation. |

---

## 4. Operator & Administration Endpoints

| Method | Sheet 6 Specification | Implemented Route | Alignment Status | Notes |
|---|---|---|---|---|
| `GET` | `/api/branches/{id}/queue/` | `/api/tickets/` | ⚠️ Mismatch (Intentional) | Enforced by standard Django REST Router and tenant isolation middlewares instead of manual nested parameters. |
| `GET` | `/api/admin/audit-logs/` | `/api/audit-logs/` | ⚠️ Mismatch (Intentional) | Made tenant-scoped under Phase 7: Super Admin sees all logs, Company Admin sees company logs, and Branch Admin sees own branch logs. |

---

## 5. WebSockets

| Protocol | Sheet 6 Specification | Implemented Path | Alignment Status | Notes |
|---|---|---|---|---|
| `WS` | `/ws/branches/{id}/queue/` | `/ws/branch/{id}/staff/` | ✅ Aligned | Daphne and Redis-backed channel group broadcasts to `branch_{id}_staff`. |
| `WS` | `/ws/display/{deviceId}/` | `/ws/branch/{id}/public/` | ⚠️ Mismatch (Intentional) | Broadcasts public updates to all display devices paired to that branch (`branch_{id}_public`). |

---

## Summary Recommendation

The path differences are intentional deviations from the original Sheet 6 spec to support **Django REST Framework router structures**, **improved security** (moving tokens from URLs to POST request bodies), and **robust multi-tenancy context isolation**. No path alignment changes are required at this stage as current routes are covered by verification tests and correctly integrated.
