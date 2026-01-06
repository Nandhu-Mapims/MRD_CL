# Hospital Audit Checklist System - Complete Application Flow Analysis

## 📋 System Overview

A comprehensive web-based audit management system for hospitals that allows:
- **Admins** to create dynamic forms with sections and checklist items
- **Users** to submit audit forms for patients by UHID
- **Centralized** tracking of all audit submissions grouped by UHID and Department
- **Reporting** and analytics for compliance monitoring

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React (Vite) + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT-based with role-based access control
- **API**: RESTful API with JSON responses

### Project Structure
```
backend/
  ├── src/
  │   ├── models/          # Mongoose schemas
  │   ├── controllers/      # Business logic
  │   ├── routes/           # API endpoints
  │   ├── middleware/       # Auth middleware
  │   └── config/          # DB connection
frontend/
  ├── src/
  │   ├── pages/           # Page components
  │   ├── components/       # Reusable components
  │   ├── context/          # React Context (Auth)
  │   └── api/             # API client
```

---

## 📊 Data Models & Relationships

### 1. **User Model**
- Fields: `name`, `email`, `passwordHash`, `role` (admin/user), `department` (ref), `isActive`
- **Relationships**: 
  - Belongs to one `Department` (if role is 'user')
  - Creates `AuditSubmission` records

### 2. **Department Model**
- Fields: `name`, `code` (unique), `isActive`
- **Relationships**:
  - Has many `Users`
  - Has many `FormTemplates` (via assignment)
  - Has many `ChecklistItems`
  - Has many `AuditSubmissions`

### 3. **FormTemplate Model**
- Fields: `name`, `description`, `departments[]` (refs), `isCommon`, `sections[]`, `isActive`
- **Relationships**:
  - Assigned to multiple `Departments`
  - Contains `sections` (embedded array)
  - Has many `ChecklistItems`
  - Has many `AuditSubmissions`

### 4. **ChecklistItem Model**
- Fields: `label`, `departmentScope` (SINGLE/ALL), `department` (ref), `formTemplate` (ref), `section`, `responseType`, `responseOptions`, `isActive`, `order`, `isMandatory`
- **Response Types**: YES_NO, YES_NO_NA, CHECKBOX, TEXT, NUMBER, DATE, TIME, DROPDOWN
- **Relationships**:
  - Belongs to one `Department` (if scope is SINGLE)
  - Belongs to one `FormTemplate` (optional)
  - Has many `AuditSubmissions`

### 5. **Patient Model**
- Fields: `uhid` (unique, uppercase), `patientName`, `dateOfBirth`, `gender`, `contactNumber`, `address`
- **Relationships**:
  - Has many `AuditSubmissions` (one patient can have multiple submissions across departments)

### 6. **AuditSubmission Model**
- Fields: `department` (ref), `formTemplate` (ref), `patient` (ref), `uhid`, `patientName`, `checklistItemId` (ref), `yesNoNa` (legacy), `responseValue`, `remarks`, `responsibility`, `status`, `submittedBy` (ref), `submittedAt`
- **Key Points**:
  - One record per checklist item per submission
  - Stores both `uhid` (for queries) and `patient` reference (for relationships)
  - Supports multiple response types via `responseValue`
  - Status: OPEN, IN_PROGRESS, CLOSED

---

## 🔐 Authentication & Authorization Flow

### Login Process
1. User submits email/password → `POST /api/auth/login`
2. Backend validates credentials, generates JWT token
3. Token stored in `localStorage` with user data
4. Token sent in `Authorization: Bearer <token>` header for all requests

### Role-Based Access
- **Admin**: Full access to all features
- **User**: Limited to assigned department only

### Protected Routes
- Frontend: `ProtectedRoute` component checks user role
- Backend: `auth` middleware validates JWT and role

---

## 🔄 Complete User Flows

### Flow 1: Admin Creates Form Template
1. Admin logs in → Redirected to `/admin/dashboard`
2. Navigate to `/admin/forms` → Create new form template
3. Assign form to department(s)
4. Navigate to `/admin/checklists` → Select form
5. Add sections to form
6. Add checklist items to sections with:
   - Response type (YES_NO_NA, TEXT, NUMBER, etc.)
   - Mandatory flag
   - Order number

### Flow 2: User Submits Audit Form
1. User logs in → Redirected based on role:
   - Admin → `/admin/dashboard`
   - User → `/` (HomeRedirect) → Auto-redirects to assigned department form
2. User navigates to `/form/:formTemplateId`
3. Form loads:
   - Fetches form template
   - Fetches checklist items for user's department
   - Groups items by section
   - Initializes empty answers state
4. User enters:
   - **UHID** (auto-checks if patient exists, auto-fills name)
   - **Patient Name** (required)
   - **Responses** for each checklist item (based on responseType)
   - **Remarks** (optional)
   - **Responsibility** (optional)
   - **Status** (OPEN/IN_PROGRESS/CLOSED)
5. User clicks "Submit Form"
6. Frontend sends `POST /api/audits` with:
   ```json
   {
     "departmentId": "...",
     "formTemplateId": "...",
     "uhid": "12345",
     "patientName": "John Doe",
     "items": [
       {
         "checklistItemId": "...",
         "responseValue": "YES",
         "remarks": "...",
         "responsibility": "...",
         "status": "OPEN"
       }
     ]
   }
   ```
7. Backend processes:
   - Validates UHID and patient name
   - Finds or creates `Patient` record
   - Creates multiple `AuditSubmission` records (one per checklist item)
   - Returns created submissions
8. Frontend shows **Success Modal** with UHID and Patient Name
9. Form resets for new submission

### Flow 3: View Department Logs
1. Admin/User navigates to `/admin/department-logs`
2. Page loads:
   - Fetches department logs via `GET /api/departments/logs`
   - Groups submissions by form submission (UHID + submittedAt)
   - Shows statistics per department
3. User clicks on **UHID** → Opens **Data Preview Modal**
4. Modal loads:
   - Fetches all submissions for UHID via `GET /api/audits/uhid/:uhid`
   - Groups by department
   - Groups by section within each department
   - Displays in organized table format

### Flow 4: Patient Report
1. Admin/User navigates to `/admin/patient-report`
2. User enters UHID and searches
3. System fetches all submissions for UHID
4. Displays report grouped by:
   - Department
   - Section
   - Checklist items with responses
5. User can export to PDF

### Flow 5: Dashboard Analytics
1. Admin navigates to `/admin/dashboard`
2. System fetches stats via `GET /api/audits/stats`
3. Displays:
   - Department-wise compliance percentages
   - Total submissions per department
   - Open vs Closed issues
   - Case counts (unique UHIDs per department)

---

## 🔌 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /login` - User login
- `POST /users` - Create user (admin only)
- `GET /users` - List users (admin only)
- `PUT /users/:id` - Update user (admin only)
- `DELETE /users/:id` - Delete user (admin only)

### Departments (`/api/departments`)
- `GET /` - List all departments
- `POST /` - Create department (admin only)
- `PUT /:id` - Update department (admin only)
- `DELETE /:id` - Delete department (admin only)
- `GET /logs` - Get department activity logs

### Form Templates (`/api/form-templates`)
- `GET /` - List all form templates
- `GET /:id` - Get form template by ID
- `POST /` - Create form template (admin only)
- `PUT /:id` - Update form template (admin only)
- `DELETE /:id` - Delete form template (admin only)

### Checklist Items (`/api/checklists`)
- `GET /department/:departmentId` - Get items for department (with optional formTemplateId query)
- `POST /` - Create checklist item (admin only)
- `PUT /:id` - Update checklist item (admin only)
- `DELETE /:id` - Delete checklist item (admin only)
- `POST /reorder` - Reorder items (admin only)

### Audit Submissions (`/api/audits`)
- `POST /` - Submit audit (admin/user)
- `PUT /` - Update audit (admin/user) - **Currently disabled in frontend**
- `GET /` - Get submissions (with optional filters)
- `GET /recent` - Get recent submissions grouped by UHID
- `GET /edit` - Get submissions for editing (by UHID + department)
- `GET /uhid/:uhid` - Get all submissions for UHID (grouped by department)
- `GET /stats` - Get statistics (admin only)
- `GET /export` - Export submissions (admin only)

### Patients (`/api/patients`)
- `GET /uhid/:uhid` - Get patient by UHID
- `GET /` - Get all patients (admin only, with pagination)

---

## 🎨 Frontend Pages & Components

### Admin Pages
1. **Dashboard** (`/admin/dashboard`)
   - Compliance statistics
   - Department-wise charts
   - Case counts

2. **Form Templates** (`/admin/forms`)
   - Create/edit/delete form templates
   - Assign to departments

3. **Form Builder** (`/admin/checklists`)
   - Add sections to forms
   - Add/edit checklist items
   - Reorder items

4. **Department Management** (`/admin/departments`)
   - CRUD operations for departments

5. **User Management** (`/admin/users`)
   - Create/edit users
   - Assign departments

6. **Department Logs** (`/admin/department-logs`)
   - View all submissions grouped by form
   - Click UHID to preview data
   - Shows patient-based view

7. **Patient Report** (`/admin/patient-report`)
   - Search by UHID
   - View all submissions for patient
   - Export to PDF

8. **Export Submissions** (`/admin/export`)
   - Filter by department/date
   - Export to CSV/JSON

### User Pages
1. **Form** (`/form/:formTemplateId`)
   - Dynamic form based on checklist items
   - Grouped by sections
   - Multiple response types
   - Success modal after submission

2. **Home Redirect** (`/`)
   - Auto-redirects admin to dashboard
   - Auto-redirects user to department form

### Shared Components
- `Layout` - Navigation bar with role-based menu
- `ProtectedRoute` - Route protection based on roles
- `EditAuditModal` - Modal for editing submissions (currently not used in main flow)

---

## 🔄 Data Flow: Form Submission to Display

### Submission Flow
```
User fills form
  ↓
Frontend: POST /api/audits
  ↓
Backend: submitAudit()
  ├─ Validates UHID & patient name
  ├─ Finds/creates Patient record
  ├─ Creates AuditSubmission records (one per checklist item)
  └─ Returns created submissions
  ↓
Frontend: Shows success modal
  ↓
Form resets
```

### Display Flow
```
User clicks UHID in Department Logs
  ↓
Frontend: GET /api/audits/uhid/:uhid
  ↓
Backend: getSubmissionsByUHID()
  ├─ Finds Patient by UHID
  ├─ Fetches all AuditSubmissions for UHID
  ├─ Groups by department
  ├─ Groups by section within department
  └─ Returns structured data
  ↓
Frontend: Displays in Data Preview Modal
  ├─ Patient info section
  ├─ Department cards
  │  ├─ Section groups
  │  └─ Checklist items table
  └─ Close button
```

---

## 🎯 Key Features & Functionality

### ✅ Implemented Features
1. **Multi-Response Types**: YES_NO_NA, TEXT, NUMBER, DATE, TIME, CHECKBOX, DROPDOWN
2. **Patient Management**: Auto-create on submission, UHID-based lookup
3. **Department Isolation**: Users can only see/submit for their department
4. **Form Grouping**: Submissions grouped by UHID + Department + FormTemplate
5. **Data Preview**: Click UHID to see all forms for that patient
6. **Success Feedback**: Modal popup after successful submission
7. **No Edit After Submit**: Edit functionality removed from main flow
8. **Department Logs**: View all submissions with grouping by form submission

### ⚠️ Current Limitations
1. **No Edit Functionality**: Users cannot edit submitted forms (intentionally removed)
2. **Single Form per UHID per Department**: Multiple submissions for same UHID+Department create separate records
3. **No Form Versioning**: Form changes affect all historical submissions
4. **No Bulk Operations**: Cannot submit/edit multiple forms at once
5. **No Notifications**: No email/alert system for submissions

---

## 🔍 Data Grouping Logic

### Department Logs Grouping
- Submissions grouped by: `UHID + submittedAt` (rounded to second)
- Each form submission appears as single record
- Shows: UHID, Patient Name, Submission Date, Status, Submitted By

### Patient Report Grouping
- All submissions for UHID grouped by:
  1. **Department** (top level)
  2. **Section** (within department)
  3. **Checklist Items** (within section, sorted by order)

### Dashboard Statistics
- Department-wise aggregation:
  - Total submissions
  - Compliant (YES responses)
  - Non-compliant (NO responses)
  - Open issues (status != CLOSED)
  - Case counts (unique UHIDs)

---

## 🚨 Current State & Known Issues

### Working Features
✅ User authentication and authorization
✅ Form creation and management
✅ Dynamic form rendering with multiple response types
✅ Patient creation and lookup
✅ Audit submission with success modal
✅ Department logs with data preview
✅ Patient report with PDF export
✅ Dashboard statistics

### Removed Features
❌ Edit submitted audits (intentionally removed per user request)
❌ Recent submissions edit links (removed)
❌ "View X submissions details" expandable section (removed)

### Potential Improvements
- Add form versioning
- Add audit trail for changes
- Add email notifications
- Add bulk export features
- Add advanced filtering
- Add data validation rules
- Add form templates cloning

---

## 📝 Next Steps for Feature Upgrades

Based on this analysis, potential upgrade areas:
1. **Form Versioning**: Track form changes over time
2. **Advanced Reporting**: Custom report builder
3. **Notifications**: Email/SMS alerts for submissions
4. **Bulk Operations**: Submit multiple forms
5. **Data Validation**: Custom validation rules per item
6. **Audit Trail**: Track who changed what and when
7. **Form Templates Library**: Reusable form templates
8. **Mobile Optimization**: Better mobile experience
9. **Offline Support**: PWA capabilities
10. **Real-time Updates**: WebSocket for live updates

---

**Document Generated**: Complete application flow analysis
**Last Updated**: Current state after recent modifications (removed edit functionality, added success modal, data preview)

