# Default Credentials & Setup

## 🔐 Default Accounts

After running the seed script (`npm run seed`), default accounts are automatically created:

### Admin Account:
- **Email**: `admin@hospital.com`
- **Password**: `Admin@123`
- **Role**: Admin (full access)

### Department User Accounts:

The seed script creates **one user account for each department**:

**Clinical Departments:**
- OG: `og@hospital.com` / `OG@123`
- GM: `gm@hospital.com` / `GM@123`
- ORTHO: `ortho@hospital.com` / `ORTHO@123`
- PED: `ped@hospital.com` / `PED@123`
- OPHTHAL: `ophthal@hospital.com` / `OPHTHAL@123`
- CS: `cs@hospital.com` / `CS@123`
- ENT: `ent@hospital.com` / `ENT@123`
- GS: `gs@hospital.com` / `GS@123`

**Common Departments:**
- ANAE: `anae@hospital.com` / `ANAE@123`
- NUS: `nus@hospital.com` / `NUS@123`

📋 **See `DEPARTMENT_CREDENTIALS.md` for complete list**

⚠️ **Security Note**: Please change the default passwords after first login!

## 📋 Seeded Departments

The seed script creates the following departments:

### Clinical Departments:
- **OG** - Obstetrics & Gynecology
- **GM** - General Medicine
- **ORTHO** - Orthopedics
- **PED** - Pediatrics
- **OPHTHAL** - Ophthalmology
- **CS** - Cardiac Surgery
- **ENT** - ENT
- **GS** - General Surgery

### Common Departments (Auto-included for all):
- **ANAE** - Anesthesiology (ANAE)
- **NUS** - Nursing Services (NUS)

## 🚀 Quick Setup Steps

1. **Backend Setup**:
   ```bash
   cd backend
   npm install
   # Create .env file with your MongoDB connection string
   npm run seed  # Creates admin + departments
   npm run dev
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Login**:
   - Go to `http://localhost:5173/login`
   - **Admin**: `admin@hospital.com` / `Admin@123`
   - **User**: `user@hospital.com` / `User@123`

## 📝 Creating Additional Users

### Via Admin Panel (Recommended):
1. Login as admin
2. Navigate to **Users** in the admin menu
3. Click **"Create New User"**
4. Fill in the form (name, email, password, role)
5. Click **"Create User"**

### Via API:
```bash
# Create User (Admin only)
POST http://localhost:5000/api/auth/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "New User",
  "email": "newuser@hospital.com",
  "password": "SecurePassword123",
  "role": "user",
  "isActive": true
}
```

### Create Admin via API:
```bash
POST http://localhost:5000/api/auth/register-admin
Content-Type: application/json

{
  "name": "New Admin",
  "email": "newadmin@hospital.com",
  "password": "SecurePassword123"
}
```

## 🔄 Resetting Seed Data

To reset and re-seed everything (including admin):

1. Stop the backend server
2. Run: `npm run seed`
3. This will:
   - Create/update the default admin user
   - Delete and recreate all departments
   - Delete and recreate all checklist items

