# Department-Wise Login Credentials

This document lists all the department-specific user accounts created by the seed script.

## 🔐 Admin Account

| Email | Password | Role | Access |
|-------|----------|------|--------|
| `admin@hospital.com` | `Admin@123` | Admin | Full system access |

## 👥 Department User Accounts

### Clinical Departments

| Department | Code | Email | Password | Role |
|------------|------|-------|----------|------|
| Obstetrics & Gynecology | OG | `og@hospital.com` | `OG@123` | User |
| General Medicine | GM | `gm@hospital.com` | `GM@123` | User |
| Orthopedics | ORTHO | `ortho@hospital.com` | `ORTHO@123` | User |
| Pediatrics | PED | `ped@hospital.com` | `PED@123` | User |
| Ophthalmology | OPHTHAL | `ophthal@hospital.com` | `OPHTHAL@123` | User |
| Cardiac Surgery | CS | `cs@hospital.com` | `CS@123` | User |
| ENT | ENT | `ent@hospital.com` | `ENT@123` | User |
| General Surgery | GS | `gs@hospital.com` | `GS@123` | User |

### Common Departments (Auto-included for all)

| Department | Code | Email | Password | Role |
|------------|------|-------|----------|------|
| Anesthesiology | ANAE | `anae@hospital.com` | `ANAE@123` | User |
| Nursing Services | NUS | `nus@hospital.com` | `NUS@123` | User |

## 📝 Password Pattern

- **Admin**: `Admin@123`
- **Department Users**: `{DEPT_CODE}@123`
  - Example: OG department → `OG@123`
  - Example: GM department → `GM@123`

## 🚀 Quick Reference

### Login as Admin:
```
Email: admin@hospital.com
Password: Admin@123
```

### Login as Department User:
```
Email: {dept_code}@hospital.com
Password: {DEPT_CODE}@123
```

**Examples:**
- OG Department: `og@hospital.com` / `OG@123`
- GM Department: `gm@hospital.com` / `GM@123`
- Orthopedics: `ortho@hospital.com` / `ORTHO@123`

## ⚠️ Security Notes

1. **Change passwords immediately** after first login
2. These are default credentials for initial setup
3. In production, use strong, unique passwords
4. Consider implementing password complexity requirements

## 🔄 Resetting Credentials

To reset all credentials and recreate users:

1. Stop the backend server
2. Run: `npm run seed` in the backend directory
3. This will recreate all department users with default passwords

## 📋 User Capabilities

### Admin Users:
- ✅ Access dashboard
- ✅ Manage departments
- ✅ Create/edit form templates
- ✅ Manage checklist items
- ✅ Create/manage users
- ✅ View all audit submissions

### Department Users:
- ✅ Select their department
- ✅ Fill audit forms
- ✅ View their own submissions
- ❌ Cannot access admin features
- ❌ Cannot manage departments or forms

