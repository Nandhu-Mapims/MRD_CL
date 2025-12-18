# Hospital Department-wise Audit Checklist System

A comprehensive web application for managing department-specific audit checklists in a hospital setting. Admin can create dynamic forms with sections, and users can fill audit forms for their assigned departments.

## 🎯 Project Overview

This system allows:
- **Admin** to create forms with sections and checklist items
- **Users** to fill audit forms for their assigned department
- **Centralized** data storage for compliance tracking
- **Dashboard** for viewing department-wise compliance statistics

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT (Role-based)
- **Styling**: Tailwind CSS with hospital-themed colors

## 📋 Features

### Admin Features
- ✅ Create and manage departments
- ✅ Create form templates with sections
- ✅ Add checklist items to sections
- ✅ Assign forms to specific departments
- ✅ Manage users and assign departments
- ✅ View compliance dashboard

### User Features
- ✅ Auto-redirect to assigned department form
- ✅ Fill audit forms with Yes/No/NA responses
- ✅ Add remarks, responsibility, and status
- ✅ Submit audit data

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### 1. Clone and Setup

```bash
# Navigate to project directory
cd MRD_Automation
```

### 2. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
# Copy the example below and update with your MongoDB connection string
```

**Create `backend/.env` file:**
```env
MONGO_URI=mongodb+srv://mrd_admin:mrd_ad@cluster0.yurdl7p.mongodb.net/mrd_audit?retryWrites=true&w=majority
JWT_SECRET=your_secure_jwt_secret_here
PORT=5000
```

**Run seed script (creates admin, departments, and users):**
```bash
npm run seed
```

**Start backend server:**
```bash
npm run dev
# Server will run on http://localhost:5000
```

### 3. Frontend Setup

```bash
# Open a new terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Frontend will run on http://localhost:5173
```

## 📝 Default Credentials

After running `npm run seed` in the backend:

### Admin Account
- **Email**: `admin@hospital.com`
- **Password**: `Admin@123`
- **Access**: Full system access

### Department User Accounts

Each department has a user account:

| Department | Email | Password |
|------------|-------|----------|
| Obstetrics & Gynecology | `og@hospital.com` | `OG@123` |
| General Medicine | `gm@hospital.com` | `GM@123` |
| Orthopedics | `ortho@hospital.com` | `ORTHO@123` |
| Pediatrics | `ped@hospital.com` | `PED@123` |
| Ophthalmology | `ophthal@hospital.com` | `OPHTHAL@123` |
| **Cardiac Surgery** | `cs@hospital.com` | `CS@123` |
| ENT | `ent@hospital.com` | `ENT@123` |
| General Surgery | `gs@hospital.com` | `GS@123` |
| Anesthesiology | `anae@hospital.com` | `ANAE@123` |
| Nursing Services | `nus@hospital.com` | `NUS@123` |

⚠️ **Security**: Change default passwords after first login!

📋 **See `CREDENTIALS.md` and `DEPARTMENT_CREDENTIALS.md` for complete details**

## 🏥 Creating Forms for Departments

### Method 1: Using the Admin UI (Recommended)

1. **Login as Admin**: `admin@hospital.com` / `Admin@123`
2. **Navigate to Form Builder**: Go to `/admin/checklists`
3. **Create New Form**:
   - Click "Create New Form"
   - Enter form name (e.g., "MAPIMS - Case Sheet Audit Checklist")
   - Select department(s) to assign
   - Click "Create Form"
4. **Add Sections**:
   - Select the form from dropdown
   - Click "+ Add Section"
   - Enter section name (e.g., "ADMISSION SLIP", "CONSENT", "OT")
   - Set order number
5. **Add Checklist Items**:
   - Click "+ Add Checklist Item to Form"
   - Select section
   - Enter item label
   - Set mandatory flag if needed
   - Set order number
   - Click "Create Item"

### Method 2: Using Seed Script (For CS Department)

The CS department form is pre-configured. To seed it:

```bash
cd backend
npm run seed:cs
```

This creates:
- **Form**: "MAPIMS - Case Sheet Audit Checklist"
- **7 Sections**: ADMISSION SLIP, INITIAL ASSESSMENT, CONSENT, OT, SURGICAL CONSENT, INVESTIGATIONS, DRUG CHART
- **31 Checklist Items**: All items from the physical form

## 📊 System Workflow

```
1. Admin creates form template
        ↓
2. Admin adds sections to form
        ↓
3. Admin adds checklist items to sections
        ↓
4. Admin assigns form to department(s)
        ↓
5. User logs in → Auto-redirected to their department
        ↓
6. Dynamic form loads (with sections)
        ↓
7. User fills audit (Yes/No/NA, remarks, responsibility, status)
        ↓
8. Data stored centrally in MongoDB
        ↓
9. Admin views compliance dashboard
```

## 🔐 Access Control

### Admin Users
- ✅ Full access to all features
- ✅ Can create/edit/delete forms
- ✅ Can manage users and departments
- ✅ Can view all audit submissions
- ✅ Can access dashboard

### Regular Users
- ✅ Can only access their assigned department
- ✅ Can fill audit forms for their department
- ✅ Can view their submissions
- ❌ Cannot access admin features
- ❌ Cannot modify forms

## 📁 Project Structure

```
MRD_Automation/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/      # Business logic
│   │   ├── middleware/       # Auth middleware
│   │   ├── models/           # Mongoose models
│   │   ├── routes/           # API routes
│   │   ├── seed/             # Seed scripts
│   │   └── server.js         # Express server
│   ├── .env                  # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── components/       # Reusable components
│   │   ├── context/          # React context (Auth)
│   │   ├── pages/
│   │   │   ├── Admin/        # Admin pages
│   │   │   └── User/         # User pages
│   │   └── App.jsx           # Main app component
│   └── package.json
├── CREDENTIALS.md            # Login credentials
├── DEPARTMENT_CREDENTIALS.md # Department-wise credentials
├── SYSTEM_FLOW.md            # Detailed system flow
└── README.md                 # This file
```

## 🎨 Admin Pages

### Dashboard (`/admin/dashboard`)
- Department-wise compliance percentages
- Total audits per department
- Open vs closed issues
- Visual progress bars

### Form Templates (`/admin/forms`)
- Create/edit/delete form templates
- Assign to departments
- Mark as common (optional)

### Form Builder (`/admin/checklists`)
- Select form to edit
- Add sections to forms
- Add checklist items to sections
- Edit/delete items
- Reorder items

### Department Management (`/admin/departments`)
- Create/edit/delete departments
- Enable/disable departments

### User Management (`/admin/users`)
- Create users
- Assign departments to users
- Edit user details
- Activate/deactivate users

## 👤 User Pages

### Department Selection (`/`)
- Auto-redirects to assigned department
- Shows department form directly

### Audit Form (`/audit/:departmentId`)
- Displays form with sections
- Yes/No/NA radio buttons
- Remarks field
- Responsibility field
- Status dropdown (OPEN/IN_PROGRESS/CLOSED)
- Submit button

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register-admin` - Create admin (initial setup)
- `POST /api/auth/users` - Create user (admin only)
- `GET /api/auth/users` - List users (admin only)
- `PUT /api/auth/users/:id` - Update user (admin only)
- `DELETE /api/auth/users/:id` - Delete user (admin only)

### Departments
- `GET /api/departments` - List departments
- `POST /api/departments` - Create department (admin)
- `PUT /api/departments/:id` - Update department (admin)
- `DELETE /api/departments/:id` - Delete department (admin)

### Form Templates
- `GET /api/form-templates` - List form templates
- `POST /api/form-templates` - Create form template (admin)
- `PUT /api/form-templates/:id` - Update form template (admin)
- `DELETE /api/form-templates/:id` - Delete form template (admin)

### Checklist Items
- `GET /api/checklists/department/:departmentId` - Get items for department
- `POST /api/checklists` - Create checklist item (admin)
- `PUT /api/checklists/:id` - Update checklist item (admin)
- `DELETE /api/checklists/:id` - Delete checklist item (admin)
- `POST /api/checklists/reorder` - Reorder items (admin)

### Audit Submissions
- `POST /api/audits` - Submit audit (user)
- `GET /api/audits` - Get submissions
- `GET /api/audits/stats` - Get statistics (admin)

## 🔄 Seeding Data

### Main Seed (Departments + Users)
```bash
cd backend
npm run seed
```
Creates:
- All departments (OG, GM, Ortho, PED, Ophthal, CS, ENT, GS, ANAE, NUS)
- Admin user
- Department-specific users (one per department)

### CS Form Seed (Pre-configured Form)
```bash
cd backend
npm run seed:cs
```
Creates:
- MAPIMS - Case Sheet Audit Checklist form
- 7 sections
- 31 checklist items
- Assigned to CS department

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB connection string in `.env`
- Ensure MongoDB is running/accessible
- Check if port 5000 is available

### Frontend can't connect to backend
- Ensure backend is running on port 5000
- Check `vite.config.js` proxy settings
- Verify CORS is enabled in backend

### Users can't see forms
- Ensure form is assigned to user's department
- Check if form is active
- Verify checklist items are active

### Login issues
- Verify credentials from `CREDENTIALS.md`
- Check if user account is active
- Ensure backend is running

## 📚 Additional Documentation

- **`CREDENTIALS.md`** - Login credentials and user setup
- **`DEPARTMENT_CREDENTIALS.md`** - Department-wise user accounts
- **`SYSTEM_FLOW.md`** - Detailed system workflow and architecture

## 🎯 Key Concepts

### Form Templates
- Reusable form structures
- Can have multiple sections
- Assigned to specific departments

### Sections
- Groups within a form
- Examples: "ADMISSION SLIP", "CONSENT", "OT"
- Each section contains multiple checklist items

### Checklist Items
- Individual questions/requirements
- Belongs to a section
- Has Yes/No/NA response
- Can be mandatory or optional

### Department Assignment
- Users are assigned to one department
- Users only see forms assigned to their department
- Admin can access all departments

## 🚀 Production Deployment

1. **Environment Variables**: Set production values in `.env`
2. **Database**: Use MongoDB Atlas or production MongoDB
3. **Security**: Change all default passwords
4. **JWT Secret**: Use strong, random JWT secret
5. **Build Frontend**: `npm run build` in frontend directory
6. **Deploy**: Use PM2 or similar for Node.js, serve frontend build

## 📞 Support

For issues or questions:
1. Check this README
2. Review `SYSTEM_FLOW.md` for workflow details
3. Check `CREDENTIALS.md` for login information

## 📝 License

ISC

---

**Built with ❤️ for Hospital Audit Management**
