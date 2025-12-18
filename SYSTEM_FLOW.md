# System Flow & Functionality

## 🔄 Complete Workflow

```
Admin creates forms (Form Templates)
        ↓
Admin adds checklist items to forms
        ↓
User logs in → Auto-redirected to their assigned department
        ↓
Dynamic form loads (based on department + common items)
        ↓
User fills audit form (Yes/No/NA, remarks, responsibility, status)
        ↓
Data stored centrally in MongoDB
        ↓
Admin views Reports & Compliance Dashboards
```

## 📋 Detailed Flow

### 1. Admin Creates Forms

**Location**: `/admin/forms` (Form Template Management)

- Admin creates **Form Templates** with:
  - Form name
  - Description
  - Department assignment (specific departments or "Common" for all)
  - Active/Inactive status

**Example**: 
- "Pre-Operative Checklist" → Assigned to OG, GM, CS
- "ANAE Safety Protocol" → Common (all departments)

### 2. Admin Adds Checklist Items

**Location**: `/admin/checklists` (Checklist Builder)

- Admin creates **Checklist Items**:
  - Label (question/requirement)
  - Scope: Single Department or ALL (common)
  - Department assignment (if single)
  - Form Template assignment (optional)
  - Mandatory flag
  - Order/Sequence

**Example**:
- "Hand hygiene compliance" → Scope: ALL, Mandatory: Yes
- "Surgical site marking verified" → Scope: SINGLE, Department: CS, Mandatory: Yes

### 3. User Login & Department Access

**User Assignment**:
- Each user is assigned to **one department** (required for regular users)
- Admin users can access all departments
- Department assignment is set during user creation or editing

**Login Flow**:
1. User logs in with credentials
2. System checks user's assigned department
3. **Auto-redirect** to audit form for their department
4. If no department assigned → Shows error message

**Example**:
- `og@hospital.com` → Assigned to "Obstetrics & Gynecology (OG)"
- Login → Auto-redirected to `/audit/{og_department_id}`

### 4. Dynamic Form Loading

**Location**: `/audit/:departmentId` (Audit Form)

**Form Logic**:
- Loads checklist items where:
  - `departmentScope = 'ALL'` (common items like ANAE/NUS)
  - **OR** `departmentScope = 'SINGLE'` AND `department = user's department`
- Items sorted by `order` field
- Shows all active items

**Form Fields per Item**:
- **Yes/No/NA** (radio buttons)
- **Remarks** (text input)
- **Responsibility** (text input - who is responsible)
- **Status** (dropdown: OPEN, IN_PROGRESS, CLOSED)

### 5. User Fills Audit Form

**User Actions**:
1. Reviews all checklist items for their department
2. Selects Yes/No/NA for each item
3. Adds remarks (optional)
4. Assigns responsibility (optional)
5. Sets status (OPEN/IN_PROGRESS/CLOSED)
6. Submits the form

**Validation**:
- Mandatory items must have Yes/No/NA selected
- User can only submit for their assigned department
- All data is validated before submission

### 6. Data Storage

**MongoDB Collections**:

**AuditSubmission**:
```javascript
{
  department: ObjectId,           // Department ID
  formTemplate: ObjectId,         // Optional form template
  checklistItemId: ObjectId,      // Checklist item reference
  yesNoNa: 'YES' | 'NO' | 'NA',  // Answer
  remarks: String,                // Additional notes
  responsibility: String,         // Responsible person/team
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED',
  submittedBy: ObjectId,          // User ID
  submittedAt: Date,             // Timestamp
  createdAt: Date,
  updatedAt: Date
}
```

**Central Storage Benefits**:
- All audit data in one place
- Easy to query and generate reports
- Historical tracking with timestamps
- User attribution for accountability

### 7. Reports & Compliance Dashboards

**Location**: `/admin/dashboard`

**Metrics Displayed**:
- **Total Audits** per department
- **Compliance %** = (YES answers / Total items) × 100
- **Open Issues** = Count of OPEN/IN_PROGRESS status items
- **Department-wise breakdown**

**Dashboard Features**:
- Visual progress bars for compliance
- Color-coded status indicators
- Real-time statistics
- Department comparison

## 🔒 Access Control

### Admin Users:
- ✅ Full access to all features
- ✅ Can create/edit/delete forms
- ✅ Can create/edit/delete checklist items
- ✅ Can manage users and departments
- ✅ Can view all audit submissions
- ✅ Can access dashboard

### Regular Users:
- ✅ Can only access their assigned department
- ✅ Can fill audit forms for their department
- ✅ Can view their own submissions
- ❌ Cannot access admin features
- ❌ Cannot access other departments
- ❌ Cannot modify forms or checklist items

## 🎯 Key Features

### Department Assignment
- Users are assigned to one department during creation
- Assignment can be changed by admin
- Users automatically see their department's audit form

### Form Templates
- Reusable form structures
- Can be assigned to multiple departments
- Can be marked as "Common" (all departments)
- Supports ANAE and NUS common forms

### Checklist Items
- Dynamic, database-driven
- No hardcoded forms
- Supports ordering and mandatory flags
- Can be assigned to form templates

### Audit Submissions
- Bulk submission (all items at once)
- Tracks who submitted and when
- Supports status tracking (OPEN/IN_PROGRESS/CLOSED)
- Stores remarks and responsibility

### Compliance Tracking
- Automatic calculation of compliance %
- Tracks open vs closed issues
- Department-wise statistics
- Historical data retention

## 📊 Data Flow Diagram

```
┌─────────────┐
│   Admin     │
│  Creates    │
│   Forms     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Admin     │
│   Adds      │
│ Checklist   │
│   Items     │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   User      │─────▶│  Dynamic     │
│   Logs In   │      │  Form Loads  │
└─────────────┘      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   User       │
                      │  Fills Form  │
                      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │   Data       │
                      │   Stored     │
                      │  (MongoDB)   │
                      └──────┬───────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  Dashboard   │
                      │  & Reports   │
                      └──────────────┘
```

## 🚀 Getting Started

1. **Run Seed Script**: Creates admin, departments, and department users
2. **Login as Admin**: `admin@hospital.com` / `Admin@123`
3. **Create Form Templates**: Go to `/admin/forms`
4. **Add Checklist Items**: Go to `/admin/checklists`
5. **Login as User**: Use department credentials (e.g., `og@hospital.com` / `OG@123`)
6. **Fill Audit Form**: Auto-redirected to department form
7. **View Dashboard**: Admin can see compliance stats

## 📝 Notes

- All forms are **100% database-driven** - no hardcoded forms
- ANAE and NUS items are automatically included for all departments
- Users can only access their assigned department
- Admin has full access to all features
- All audit data is stored centrally for reporting

