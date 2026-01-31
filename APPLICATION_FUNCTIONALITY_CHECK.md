# Application Functionality Check

Summary of the complete application flow and verification (routes, roles, APIs, and one fix applied).

---

## 1. Authentication & Access

| Item | Status |
|------|--------|
| **Login** | `POST /api/auth/login` → returns `token` + `user`. Token and user stored in localStorage. |
| **Protected routes** | `ProtectedRoute` checks `user` and `roles`; redirects to `/login` if no user, to `/` if role not allowed. |
| **Home redirect** | Admin → `/admin/dashboard`, Auditor → `/auditor/dashboard`, Chief → `/chief/dashboard`. |
| **Logout** | Clears `token` and `user` from localStorage. |
| **API client** | Sends `Authorization: Bearer <token>`; on 401 clears storage and redirects to login (except patient-report). |

---

## 2. Routes & Layout

### App.jsx routes
- `/login` – LoginPage (public)
- `/admin/departments`, `/admin/users`, `/admin/assign-forms` – admin only
- `/admin/forms`, `/admin/checklists`, `/admin/dashboard`, `/admin/analytics` – admin only
- `/admin/patient-report`, `/admin/department-logs` – admin, auditor, chief
- `/form/:formTemplateId` – admin, auditor, chief
- `/user-manual` – admin, auditor, chief
- `/chief/dashboard`, `/chief/analytics`, `/chief/doctor-performance` – admin, chief
- `/auditor/dashboard`, `/auditor/analytics` – admin, auditor
- `/` – HomeRedirect (admin/auditor/chief)
- `*` – Navigate to `/`

### Layout sidebar
- **Admin**: Dashboard, Analytics, Patient Report, Department Logs; Create Forms (Forms, Form Builder); Configure (Departments, Users, Assign Forms — Chief Doctors removed); User Manual.
- **Auditor**: My Dashboard, My Analytics; Available Forms (from `/form-templates/accessible/list`); Patient Report, Department Logs; User Manual.
- **Chief**: Chief Dashboard, Analytics, Auditor Performance; Available Forms; Patient Report, Department Logs (HOD); User Manual.

---

## 3. Backend APIs Used by Frontend

| Frontend usage | Backend route | Auth |
|----------------|---------------|------|
| Login | `POST /api/auth/login` | Public |
| Forms list (sidebar) | `GET /api/form-templates/accessible/list` | admin, auditor, chief |
| Form by ID | `GET /api/form-templates/:id` | admin, auditor, chief |
| Unit Chief dropdown (Form) | `GET /api/chief-doctors?isActive=true` | admin, auditor, chief |
| Check duplicate | `GET /api/audits/check-duplicate?uhid&ipid&departmentId&auditDate&auditTime` | admin, auditor |
| Submit audit | `POST /api/audits` (body: uhid, ipid, auditDate, auditTime, items, …) | admin, auditor |
| Submissions by UHID (report/logs) | `GET /api/audits/uhid/:uhid` → `{ submissions, groupedByDateAndIPID }` | admin, auditor, chief |
| Submissions by IPID | `GET /api/audits/ipid/:ipid` | admin, auditor, chief |
| Department logs | `GET /api/departments/logs` | admin, auditor, chief |
| Admissions by UHID | `GET /api/admissions/patient/:uhid` | (via same auth as caller) |
| Chief doctor performance | `GET /api/chief/doctor-performance?chiefName=...` | admin, chief |
| Notifications | `GET /api/notifications`, `POST /api/notifications/:id/read`, `POST /api/notifications/read-all` | (auditor/chief) |

---

## 4. Main Flows Verified

### Submit checklist (auditor/chief form)
1. User opens form via sidebar (`/form/:formTemplateId`).
2. Form loads template + chief doctors (Unit Chief dropdown).
3. User enters UHID, IPID, Patient Name, Ward, Unit No, Unit Chief, **Audit Date**, **Audit Time**.
4. Duplicate check: `GET /api/audits/check-duplicate` with uhid, ipid, departmentId, auditDate, auditTime.
5. Submit: `POST /api/audits` with same + items; backend enforces uniqueness by UHID+IPID+Department+Date+Time.

### Patient report
1. User enters UHID → `GET /api/audits/uhid/:uhid` preferred.
2. Response `groupedByDateAndIPID` (date + time + IPID) used for list.
3. User selects one group → report built from that group’s `submissions` (no extra IPID call when using groups).
4. Fallback: if no groups, admissions API and then virtual admissions from submissions.

### Department logs
1. `GET /api/departments/logs` loads department summary.
2. User clicks UHID → `GET /api/audits/uhid/:uhid`; list shows groups (date + time + IPID).
3. User selects one group → preview built from that group’s submissions.

### Chief: corrective/preventive
- Chief Dashboard / APIs: `GET /api/chief/patient-submissions`, `PUT /api/chief/submissions/:id/corrective-preventive`, etc.
- Notifications created when chief adds actions; auditors see them via notification bell.

---

## 5. Fix Applied During Check

**Form template route order**  
- **Issue**: `GET /accessible/list` was defined after `GET /:id`. In Express, order can matter for similar paths.  
- **Change**: `GET /accessible/list` moved before `GET /:id` in `backend/src/routes/formTemplateRoutes.js` so “accessible list” is always matched correctly.

---

## 6. Removed / Unused

- **Chief Doctor Management screen**: Removed from Configure menu and from App routes. Chief access is given only via **Configure → Users** (role Chief + department).
- **ChiefDoctorManagement.jsx**: Still in repo but not linked; Form and MultiDepartmentForm still use `GET /api/chief-doctors` for Unit Chief dropdown (backend route unchanged).

---

## 7. Environment / Startup

- Backend: `JWT_SECRET` and MongoDB connection required; default admin created on startup if missing.
- Frontend: uses `/api` (relative); ensure dev proxy or server serves API at `/api` for full functionality.

---

*Last check: routes, Layout, AuthContext, ProtectedRoute, HomeRedirect, audit/form-template/department/chief/chief-doctor/auth routes, and form/report/logs flows.*
