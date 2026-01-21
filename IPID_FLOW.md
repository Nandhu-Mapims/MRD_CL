# IPID (In-Patient ID) System Flow

## Overview

The system implements a dual-ID structure for patient management:
- **UHID (Unique Hospital ID)**: Lifetime unique identifier for each patient
- **IPID (In-Patient ID)**: Unique identifier for each admission episode

## Key Concepts

### UHID (Unique Hospital ID)
- **Lifetime Unique**: One UHID per patient, never changes
- **Format**: Custom format (e.g., "UHID123456")
- **Purpose**: Links all patient records across all admissions
- **Example**: Patient "John Doe" has UHID "UHID001" for life

### IPID (In-Patient ID)
- **Admission Unique**: New IPID for each admission
- **Format**: `IP-YYYY-MM-XXXXX` (e.g., `IP-2024-01-00001`, `IP-2024-03-00001`)
- **Purpose**: Tracks individual admission episodes
- **Example**: Same patient can have multiple IPIDs:
  - `IP-2024-01-00001` (January admission)
  - `IP-2024-03-00002` (March admission)
  - `IP-2024-07-00015` (July admission)

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT ADMISSION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. PATIENT ARRIVES
   │
   ├─► Check if UHID exists
   │   │
   │   ├─► NEW PATIENT
   │   │   ├─► Create Patient record with UHID
   │   │   └─► UHID: UHID001 (lifetime unique)
   │   │
   │   └─► EXISTING PATIENT
   │       └─► Use existing UHID: UHID001
   │
   │
2. USER ENTERS IPID
   │
   ├─► User enters IPID from admission slip
   │   │
   ├─► System checks if IPID exists
   │   │
   │   ├─► IPID EXISTS
   │   │   ├─► Verify UHID matches
   │   │   └─► Use existing admission
   │   │
   │   └─► IPID DOES NOT EXIST
   │       ├─► Create new admission with entered IPID
   │       └─► Validate uniqueness
   │
   │
3. AUDIT SUBMISSION
   │
   ├─► Submit audit form
   │   ├─► UHID: UHID001 (patient identifier)
   │   ├─► IPID: IP-2024-01-00001 (admission identifier)
   │   └─► Link to Admission record
   │
   │
4. DISCHARGE
   │
   ├─► Mark admission as discharged
   │   ├─► Update Admission status: "Discharged"
   │   ├─► Set dischargeDate
   │   └─► IPID remains: IP-2024-01-00001 (historical record)
   │
   │
5. READMISSION (Same Patient)
   │
   ├─► Patient returns (same UHID)
   │   ├─► UHID: UHID001 (same as before)
   │   ├─► Create NEW admission
   │   └─► NEW IPID: IP-2024-03-00002 (different admission)
   │
   └─► Repeat flow from step 2
```

## Example Scenario

### Patient: John Doe

**First Admission (January 2024)**
- UHID: `UHID001` (created)
- IPID: `IP-2024-01-00001` (generated)
- Admission Date: 2024-01-15
- Discharge Date: 2024-01-25
- Ward: Ward-A, Unit: 101

**Second Admission (March 2024)**
- UHID: `UHID001` (same patient)
- IPID: `IP-2024-03-00001` (new admission)
- Admission Date: 2024-03-10
- Discharge Date: 2024-03-20
- Ward: Ward-B, Unit: 205

**Third Admission (July 2024)**
- UHID: `UHID001` (same patient)
- IPID: `IP-2024-07-00015` (new admission)
- Admission Date: 2024-07-05
- Discharge Date: 2024-10-15
- Ward: Ward-C, Unit: 310

## Database Structure

### Patient Model
```javascript
{
  uhid: "UHID001",           // Lifetime unique
  patientName: "John Doe",
  dateOfBirth: Date,
  gender: "Male",
  contactNumber: "...",
  address: "..."
  // Note: ward/unitNo moved to Admission
}
```

### Admission Model
```javascript
{
  ipid: "IP-2024-01-00001",  // Unique per admission
  patient: ObjectId,          // Reference to Patient
  uhid: "UHID001",           // Denormalized for queries
  admissionDate: Date,
  dischargeDate: Date,
  ward: "Ward-A",
  unitNo: "101",
  status: "Admitted" | "Discharged",
  department: ObjectId,
  diagnosis: "...",
  admittingDoctor: "..."
}
```

### AuditSubmission Model
```javascript
{
  patient: ObjectId,         // Reference to Patient
  admission: ObjectId,       // Reference to Admission
  uhid: "UHID001",          // Denormalized
  ipid: "IP-2024-01-00001", // Denormalized
  department: ObjectId,
  formTemplate: ObjectId,
  checklistItemId: ObjectId,
  responseValue: "YES",
  // ... other fields
}
```

## API Endpoints

### Admission Management

#### Create Admission
```http
POST /api/admissions
Body: {
  "ipid": "IP-2024-01-00001",  // REQUIRED - User must enter IPID
  "uhid": "UHID001",
  "patientName": "John Doe",
  "ward": "Ward-A",
  "unitNo": "101",
  "admissionDate": "2024-01-15",
  "admissionType": "Elective",
  "departmentId": "...",
  "diagnosis": "..."
}
Response: {
  "ipid": "IP-2024-01-00001",
  "patient": {...},
  "admissionDate": "2024-01-15",
  "status": "Admitted",
  ...
}
```

#### Get Admission by IPID
```http
GET /api/admissions/ipid/IP-2024-01-00001
Response: {
  "ipid": "IP-2024-01-00001",
  "uhid": "UHID001",
  "patient": {...},
  "admissionDate": "2024-01-15",
  "dischargeDate": null,
  "status": "Admitted",
  ...
}
```

#### Get All Admissions for Patient
```http
GET /api/admissions/patient/UHID001
Response: {
  "uhid": "UHID001",
  "totalAdmissions": 3,
  "admissions": [
    {
      "ipid": "IP-2024-07-00015",
      "admissionDate": "2024-07-05",
      "dischargeDate": "2024-10-15",
      "status": "Discharged"
    },
    {
      "ipid": "IP-2024-03-00001",
      "admissionDate": "2024-03-10",
      "dischargeDate": "2024-03-20",
      "status": "Discharged"
    },
    {
      "ipid": "IP-2024-01-00001",
      "admissionDate": "2024-01-15",
      "dischargeDate": "2024-01-25",
      "status": "Discharged"
    }
  ]
}
```

#### Get Active Admission
```http
GET /api/admissions/patient/UHID001/active
Response: {
  "ipid": "IP-2024-07-00015",
  "status": "Admitted",
  "admissionDate": "2024-07-05",
  "dischargeDate": null,
  ...
}
```

#### Discharge Admission
```http
PUT /api/admissions/IP-2024-01-00001/discharge
Body: {
  "dischargeDate": "2024-01-25"
}
Response: {
  "ipid": "IP-2024-01-00001",
  "status": "Discharged",
  "dischargeDate": "2024-01-25",
  ...
}
```

### Audit Submission (Updated)

#### Submit Audit
```http
POST /api/audits
Body: {
  "uhid": "UHID001",
  "patientName": "John Doe",
  "ipid": "IP-2024-01-00001",  // REQUIRED - User must enter IPID
  "departmentId": "...",
  "formTemplateId": "...",
  "ward": "Ward-A",
  "unitNo": "101",
  "items": [...],
  "admissionDate": "2024-01-15"  // Optional
}
Response: {
  "admission": {
    "ipid": "IP-2024-01-00001",
    ...
  },
  "submissions": [...]
}
```

## IPID Entry Logic

### Format
- **User-Entered**: IPID is manually entered by the user
- **Format**: Any format (e.g., `IP-2024-01-00001`, `IP001`, `ADM-001`, etc.)
- **Uniqueness**: System validates that IPID is unique across all admissions
- **Validation**: 
  - Must be provided (required field)
  - Must be unique (cannot duplicate existing IPID)
  - Case-insensitive (automatically converted to uppercase)

### Entry Rules
1. **Manual Entry**: User enters IPID from admission slip/OP card
2. **Uniqueness Check**: System validates IPID doesn't already exist
3. **UHID Verification**: If admission exists, verifies UHID matches
4. **Case Handling**: Automatically converts to uppercase for consistency

### Example IPIDs
```
User can enter any format:
  IP-2024-01-00001
  IP-2024-03-00001
  IP-2024-07-00015
  IP001
  ADM-001
  INP-2024-001
  (Any custom format)
```

## Frontend Integration

### Form Submission Flow

1. **User enters UHID** (from OP card)
2. **User enters IPID** (from admission slip/OP card) - **REQUIRED**
3. **System checks**:
   - Patient exists? (by UHID) - Create if new
   - IPID exists? (by IPID)
4. **If IPID exists**:
   - Verify UHID matches the admission
   - Use existing admission
   - Auto-fill Ward/Unit from admission (if available)
5. **If IPID does not exist**:
   - Create new admission with entered IPID
   - User enters Ward/Unit
   - Validate IPID uniqueness
6. **Submit audit**:
   - Link to Patient (UHID)
   - Link to Admission (IPID)
   - Store both UHID and IPID in submission

### Display in UI

**Patient Information Section:**
```
UHID: UHID001 (Lifetime ID)
IPID: IP-2024-01-00001 (Current Admission)
Patient Name: John Doe
Ward: Ward-A
Unit No: 101
```

**Admission History:**
```
Admission History for UHID001:
1. IP-2024-07-00015 | 2024-07-05 to 2024-10-15 | Discharged
2. IP-2024-03-00001 | 2024-03-10 to 2024-03-20 | Discharged
3. IP-2024-01-00001 | 2024-01-15 to 2024-01-25 | Discharged
```

## Benefits

1. **Clear Separation**: UHID for patient identity, IPID for admission tracking
2. **Historical Tracking**: Each admission is uniquely identifiable
3. **Data Integrity**: Can track all audits per admission episode
4. **Reporting**: Generate reports by admission (IPID) or patient lifetime (UHID)
5. **Compliance**: Meets NABH requirements for admission tracking

## Migration Notes

### Existing Data
- Existing patients will need admissions created
- Existing audit submissions will need IPID backfilled
- Migration script recommended for production

### Backward Compatibility
- UHID remains in AuditSubmission for queries
- IPID added as new field
- Both fields indexed for performance

