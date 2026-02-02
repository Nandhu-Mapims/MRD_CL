# Application Errors and Issues Report

**Date:** Generated from codebase check  
**Scope:** Frontend (React/Vite), Backend (Node/Express/MongoDB)

---

## ✅ No Critical Errors Found

- **Linter:** No ESLint/linter errors in `frontend/src` or `backend/src`.
- **Frontend build:** `npm run build` succeeds. One non-blocking warning (see below).

---

## 🔴 Bugs to Fix

### 1. **User Management – Department not updated for auditor/chief** (Backend)

**File:** `backend/src/controllers/authController.js` (around lines 189–194)

**Issue:** In `updateUser`, `department` is only set when `role === 'user'`. Your app uses roles `admin`, `auditor`, and `chief`. So when an admin edits an auditor or chief and changes their department, the backend never updates `department`.

**Current logic:**
```javascript
if (role === 'user' && departmentId) {
  update.department = departmentId;
} else if (role === 'admin') {
  update.department = undefined;
}
```

**Suggested fix:** Set department for auditor and chief when `departmentId` is provided, and clear it for admin:

```javascript
if (role === 'admin') {
  update.department = undefined;
} else if ((role === 'auditor' || role === 'chief') && departmentId) {
  update.department = departmentId;
}
```

---

## 🟡 Warnings / Non-blocking

### 2. **Frontend build – Large chunk size**

**Message:**  
`Some chunks are larger than 500 kB after minification. Consider code-splitting.`

**Impact:** Slower initial load; no runtime error.

**Suggestion:** Use dynamic `import()` for heavy routes (e.g. Admin analytics, Form builders) or adjust `build.rollupOptions.output.manualChunks` in `vite.config.js`.

---

### 3. **Environment – JWT and CORS**

- **JWT_SECRET:** If not set in `.env`, the backend **exits** on startup (`authController.js` and `auth.js`). Ensure `.env` has `JWT_SECRET` (e.g. from `openssl rand -base64 32`).
- **CORS_ORIGIN:** Default in `server.js` is `http://localhost:3000`. With Vite, the dev server is usually `http://localhost:5173`. The Vite proxy sends `/api` to the backend, so the browser still talks to the same origin and CORS may not block. If you ever call the API from a different origin, set `CORS_ORIGIN` (e.g. `http://localhost:5173`) in `.env`.

---

### 4. **Console logging in production**

There are many `console.error` and `console.warn` calls in frontend and backend. They are useful for debugging but add noise in production.

**Suggestion:** Use a logging library or wrap in `if (process.env.NODE_ENV !== 'production')` (backend) and guard frontend logs similarly so they can be stripped or reduced in production.

---

## ✅ Checks Performed

| Check | Result |
|-------|--------|
| Linter (frontend + backend) | No errors |
| Frontend `npm run build` | Success |
| API path alignment (frontend `apiClient` vs backend routes) | Paths match (all under `/api/*`) |
| Auth login response (user + department) | Department returned as `{ id, name, code }`; frontend handles both `id` and `_id` |
| Chief bulk save (corrective/preventive) | Fixed earlier; uses bulk fields or first NO row |
| Notification API (`limit` query) | Backend accepts `limit`; frontend sends `limit=10` |

---

## Summary

- **Must fix:** Bug #1 (auditor/chief department not updated in User Management).
- **Optional:** Chunk size / code-splitting, env (JWT_SECRET, CORS_ORIGIN), and reducing console logging in production.

No other application-breaking errors were found in the areas checked.
