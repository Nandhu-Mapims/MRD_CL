# He folder – MongoDB backup (full dump)

This folder is a **full** MongoDB dump for the database **`mrd_audit`** (BSON data + metadata).

## Contents

- **Collections**: `admissions`, `auditsubmissions`, `checklistitems`, `chiefdoctors`, `departments`, `formtemplates`, `masterdatas`, `notifications`, `patients`, `users`
- **Source**: MongoDB 7.0.29 / mongodump 100.14.0 (see `prelude.json`).

## Restore from He (replace current DB with He backup)

This **removes** existing data in `mrd_audit` and loads only the He backup.

**Option A – MongoDB running in Docker (recommended)**

From the project root:

```powershell
.\restore-from-He.ps1
```

**Option B – MongoDB Database Tools installed on host**

```powershell
$env:MONGO_HOST="localhost"; $env:MONGO_PORT="27017"
$env:MONGO_ROOT_USERNAME="admin"; $env:MONGO_ROOT_PASSWORD="changeme"
.\restore-mongodb.ps1 -DumpDir "He"
```

**Option C – Compass**

Use Compass to import the BSON files into the appropriate collections (after dropping existing ones), or run one of the scripts above and then connect Compass to view the restored data.

## Compass connection (after restore)

- **URI**: `mongodb://admin:changeme@localhost:27017/mrd_audit?authSource=admin`  
  (when using default Docker Compose)
- **Database**: `mrd_audit`
