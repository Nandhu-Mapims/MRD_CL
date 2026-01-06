# Form-to-Department Assignment Guide

## 📋 Overview

This guide explains how to assign forms (Form Templates) to individual departments in the hospital audit checklist system. Each form can be assigned to one or more departments, and users will only see forms that are assigned to their department.

## 🎯 Key Concepts

### Form Templates
- **Form Templates** are reusable audit form structures
- They contain **sections** (e.g., "ADMISSION SLIP", "CONSENT", "OT")
- Each section can have multiple **checklist items**
- Forms must be assigned to at least one department to be accessible

### Department Assignment
- **One form can be assigned to multiple departments**
- **One department can have multiple forms**
- Assignment is done during form creation or editing
- Forms assigned to a department will appear for users in that department

## 🚀 How to Assign Forms to Departments

### Method 1: Using Form Builder with Sections (Recommended)

**Location**: `/admin/form-builder-with-sections`

#### Step 1: Create a New Form
1. Click **"+ Create New Form"** button
2. Fill in:
   - **Form Name** (e.g., "MAPIMS - Case Sheet Audit Checklist")
   - **Description** (optional)
   - **Assign to Departments** - Select one or more departments using checkboxes
   - **Active** checkbox (checked by default)
3. Click **"Create Form"**

#### Step 2: Assign Departments After Creation
1. Select a form from the dropdown: **"Select Form to Edit"**
2. In the **"Assigned Departments"** section, you'll see:
   - Current assigned departments (as badges)
   - A dropdown to quickly add more departments: **"+ Quick Assign Department"**
3. To **add a department**:
   - Select from the dropdown: **"+ Quick Assign Department"**
   - The department will be added immediately
4. To **remove a department**:
   - Click the **"×"** button on the department badge
   - The department will be removed immediately

#### Step 3: Edit Form Details (Alternative Method)
1. Click **"Edit Form Details"** button
2. In the modal, you'll see a **"Assign to Departments"** section with checkboxes
3. Check/uncheck departments as needed
4. Click **"Update Form"**

---

### Method 2: Using Form Template Management

**Location**: `/admin/forms` (Form Template Management)

#### Step 1: Create a New Form Template
1. Click **"+ Create New Form"** button
2. Fill in form details
3. In the **"Assign to Departments"** section:
   - You'll see a list of all active departments with checkboxes
   - Check the departments you want to assign this form to
   - **⚠️ Warning**: At least one department must be selected
4. Click **"Create Form"**

#### Step 2: Edit Existing Form
1. Find the form in the table
2. Click **"Edit"** button
3. Modify the department assignments using checkboxes
4. Click **"Update Form"**

---

## 📊 Visual Indicators

### In Form Builder with Sections:
- **Blue badges** show assigned departments: `Department Name (CODE)`
- **⚠️ No departments assigned** warning appears if form has no departments
- **"+ Quick Assign Department"** dropdown is always visible when a form is selected

### In Form Template Management:
- Departments are displayed as **blue badges** in the "Assigned Departments" column
- **⚠️ Not Assigned** warning appears if no departments are assigned
- Count indicator shows: `"X department(s) can access this form"`

---

## 🔄 Form Access Logic

### For Users:
When a user logs in and accesses their audit form:

1. System loads forms where:
   - The form is assigned to the user's department
   - **OR** the form is marked as `isCommon: true` (available to all)

2. System loads checklist items where:
   - Item has `departmentScope = 'ALL'` (common items like ANAE, NUS)
   - **OR** item has `departmentScope = 'SINGLE'` AND `department = user's department`
   - **AND** item is associated with an assigned form template

### Example Scenario:

**Form**: "Pre-Operative Checklist"
- Assigned to: OG, GM, CS departments

**User**: `og@hospital.com` (assigned to OG department)
- ✅ **Can access** "Pre-Operative Checklist" because OG is assigned
- ✅ Can see all checklist items in that form

**User**: `ortho@hospital.com` (assigned to Orthopedics department)
- ❌ **Cannot access** "Pre-Operative Checklist" because Orthopedics is not assigned
- ❌ Will not see checklist items from this form

---

## 💡 Best Practices

### 1. Assign Forms During Creation
- Always assign departments when creating a new form
- This prevents orphaned forms that no one can access

### 2. Use Descriptive Form Names
- Include department codes if form is department-specific
- Example: "OG - Pre-Operative Checklist"
- Example: "CS - Surgical Safety Protocol"

### 3. Multiple Department Assignment
- If a form is relevant to multiple departments, assign it to all of them
- Example: "Hand Hygiene Audit" → Assign to all departments

### 4. Regular Review
- Periodically review which forms are assigned to which departments
- Remove unused assignments to keep the system clean

### 5. Department-Specific Forms
- If a form is only for one department, assign it only to that department
- This prevents confusion and reduces clutter for other departments

---

## 🛠️ Technical Details

### Backend Structure

**FormTemplate Model:**
```javascript
{
  name: String,
  description: String,
  departments: [ObjectId],  // Array of Department ObjectIds
  isCommon: Boolean,        // If true, available to all departments
  sections: [{
    name: String,
    order: Number,
    description: String
  }],
  isActive: Boolean
}
```

### API Endpoints

**Create Form with Departments:**
```http
POST /api/form-templates
Body: {
  name: "Form Name",
  description: "Description",
  departmentIds: ["dept1_id", "dept2_id"],  // Array of department IDs
  isActive: true
}
```

**Update Form Departments:**
```http
PUT /api/form-templates/:id
Body: {
  name: "Form Name",
  departmentIds: ["dept1_id", "dept2_id"],  // Updated array
  // ... other fields
}
```

**Get Forms (with populated departments):**
```http
GET /api/form-templates
Response: [{
  _id: "...",
  name: "Form Name",
  departments: [
    { _id: "...", name: "Department Name", code: "DEPT" }
  ]
}]
```

---

## ❓ Common Questions

### Q: Can I assign a form to all departments at once?
**A**: Yes, you can select all departments using checkboxes. Alternatively, you can set `isCommon: true` for forms that should be available to all departments.

### Q: What happens if I remove a department assignment?
**A**: Users in that department will no longer see or have access to that form. Existing audit submissions are not deleted, but new submissions cannot be created.

### Q: Can one form be assigned to multiple departments?
**A**: Yes! This is the recommended approach when a form is relevant to multiple departments (e.g., "Hand Hygiene Audit" for all departments).

### Q: What's the difference between `isCommon` and assigning to all departments?
**A**: 
- `isCommon: true` - Form is available to ALL departments automatically, even newly created ones
- Assigning to all departments manually - You must manually assign to each department

### Q: How do I see which forms are assigned to a specific department?
**A**: In Form Template Management (`/admin/forms`), you can see all forms and their assigned departments in the table view.

---

## 📝 Quick Reference

### Create Form & Assign Departments:
1. Go to `/admin/form-builder-with-sections` or `/admin/forms`
2. Click **"+ Create New Form"**
3. Fill form name and description
4. **Check departments** you want to assign
5. Click **"Create Form"**

### Add Department to Existing Form:
1. Select the form
2. Use **"+ Quick Assign Department"** dropdown
3. Or click **"Edit Form Details"** and check additional departments

### Remove Department from Form:
1. Select the form
2. Click **"×"** on the department badge
3. Or edit the form and uncheck the department

### View All Assignments:
1. Go to `/admin/forms`
2. View the **"Assigned Departments"** column in the table
3. Each form shows its assigned departments as badges

---

## ✅ Checklist for Form Assignment

- [ ] Form has a clear, descriptive name
- [ ] At least one department is assigned
- [ ] Form is marked as Active
- [ ] Assigned departments match the form's purpose
- [ ] Multiple departments are assigned if the form is relevant to multiple departments
- [ ] Form description explains the form's purpose

---

**Last Updated**: 2024
**System Version**: Hospital Audit Checklist System


