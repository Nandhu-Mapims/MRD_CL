# 🔐 Login Credentials

Complete list of all login credentials for the Hospital Audit Checklist System.

## 📌 Quick Access

- **Login URL**: `http://localhost:5173/login`
- **Admin Panel**: Available after logging in as admin

---

## 👑 Admin Account

| Email | Password | Role | Access Level |
|-------|----------|------|--------------|
| `admin@hospital.com` | `Admin@123` | Admin | Full system access (all departments, forms, users, analytics) |

---

## 👥 Department User Accounts

These accounts are created by the base seed script (`npm run seed`). Each department has one user account.

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

### Common Departments (Auto-included for all patients)

| Department | Code | Email | Password | Role |
|------------|------|-------|----------|------|
| Anesthesiology | ANAE | `anae@hospital.com` | `ANAE@123` | User |
| Nursing Services | NUS | `nus@hospital.com` | `NUS@123` | User |

---

## 👨‍⚕️ Doctor User Accounts

These accounts are created by the multi-department dummy data seeding script (`npm run seed:multidept`). Multiple doctor users are created for testing purposes.

### Password Pattern
All doctor users created by the seeding script use the password: **`password123`**

### Email Pattern
- Format: `{dept_code}{number}@hospital.com`
- Examples:
  - `og1@hospital.com` (OG Department Doctor 1)
  - `gm1@hospital.com` (GM Department Doctor 1)
  - `ortho1@hospital.com` (Orthopedics Doctor 1)
  - `cs1@hospital.com` (Cardiac Surgery Doctor 1)

### Common Department Doctors
- **ANAE Doctor**: `anae@hospital.com` / `password123`
  - Name: Dr. Anesthesia Specialist
- **NUS Doctor**: `nus@hospital.com` / `password123`
  - Name: Dr. Nursing Head

**Note**: The email pattern for doctor users may conflict with department user accounts if both seed scripts are run. Department user accounts (e.g., `og@hospital.com`) take precedence.

---

## 🔄 Credential Creation

### Base Seed Script (`npm run seed`)
Creates:
- ✅ Admin account: `admin@hospital.com` / `Admin@123`
- ✅ Department user accounts (one per department)
- ✅ All departments

### Multi-Department Dummy Data Script (`npm run seed:multidept`)
Creates:
- ✅ Doctor users for each clinical department
- ✅ Doctor users for common departments (ANAE, NUS)
- ✅ Dummy patient data
- ✅ Dummy audit submissions

---

## 🔑 Password Patterns Summary

| Account Type | Pattern | Example |
|--------------|---------|---------|
| Admin | `Admin@123` | Fixed |
| Department Users | `{DEPT_CODE}@123` | `OG@123`, `GM@123` |
| Doctor Users | `password123` | Fixed (from seeding script) |

---

## 📝 Quick Login Examples

### Login as Admin:
```
Email: admin@hospital.com
Password: Admin@123
```

### Login as Department User (General Medicine):
```
Email: gm@hospital.com
Password: GM@123
```

### Login as Doctor User (Cardiac Surgery):
```
Email: cs1@hospital.com
Password: password123
```

### Login as Anesthesiology Doctor:
```
Email: anae@hospital.com
Password: password123
```
(Note: This may conflict with department user account if both seeds are run)

---

## ⚠️ Security Notes

1. **Change Default Passwords**: All passwords should be changed immediately after first login in production environments
2. **Production Setup**: Never use default credentials in production
3. **User Management**: Use the Admin panel to create additional users with secure passwords
4. **Access Control**: 
   - Admin users have full access
   - Department users can only see and edit their own department's checklists
   - Doctor users follow the same access rules as department users

---

## 🚀 First Time Setup

1. **Run base seed**:
   ```bash
   cd backend
   npm run seed
   ```
   This creates admin and department user accounts.

2. **Optionally run dummy data seed**:
   ```bash
   npm run seed:multidept
   ```
   This creates doctor users and test data.

3. **Login**:
   - Navigate to `http://localhost:5173/login`
   - Use admin credentials: `admin@hospital.com` / `Admin@123`
   - Or use any department user credentials listed above

---

## 📞 Support

For issues with login or user access:
1. Check that the seed scripts have been run
2. Verify MongoDB connection
3. Check user's `isActive` status in the database
4. Contact system administrator

---

**Last Updated**: Generated automatically from codebase analysis

