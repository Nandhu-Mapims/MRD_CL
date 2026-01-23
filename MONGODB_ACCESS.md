# MongoDB Data Access Guide

## 📍 Where is the Data Stored?

Your MongoDB data is stored in **Docker volumes** on your local machine.

### Location

**Windows:**
```
\\wsl$\docker-desktop-data\data\docker\volumes\mrd_cl_mongodb_data\_data
```

Or via Docker Desktop:
- Open Docker Desktop
- Go to **Volumes** tab
- Find `mrd_cl_mongodb_data`
- Click to view data location

### Docker Volumes

The data persists in these Docker volumes:
- `mrd_cl_mongodb_data` - Main database files
- `mrd_cl_mongodb_config` - Configuration files

## 🔌 Connection Details

### From MongoDB Compass (as you're using):

**Connection String:**
```
mongodb://admin:Checklistmapims@2026@localhost:27017/mrd_audit?authSource=admin
```

**Or individual settings:**
- **Host**: `localhost`
- **Port**: `27017`
- **Authentication**: Username/Password
- **Username**: `admin`
- **Password**: `Checklistmapims@2026`
- **Authentication Database**: `admin`
- **Database**: `mrd_audit`

### From Command Line:

```powershell
# Connect to MongoDB shell
docker compose exec mongodb mongosh -u admin -p Checklistmapims@2026 --authenticationDatabase admin

# Then switch to database
use mrd_audit

# View collections
show collections

# Count documents
db.checklistitems.countDocuments()
db.users.countDocuments()
db.patients.countDocuments()
```

## 📊 Collections in Your Database

Based on your MongoDB Compass view, you have:

1. **checklistitems** - 82 documents (checklist items for forms)
2. **formtemplates** - Form templates
3. **users** - User accounts
4. **departments** - Department information
5. **patients** - Patient records
6. **admissions** - Admission records
7. **auditsubmissions** - Audit checklist submissions

## 🔍 View Data

### From MongoDB Compass:
- Already connected ✅
- Browse collections in left sidebar
- View documents in main area

### From Command Line:

```powershell
# View checklist items
docker compose exec mongodb mongosh -u admin -p Checklistmapims@2026 --authenticationDatabase admin --eval "use mrd_audit; db.checklistitems.find().limit(5).pretty()"

# View users
docker compose exec mongodb mongosh -u admin -p Checklistmapims@2026 --authenticationDatabase admin --eval "use mrd_audit; db.users.find().pretty()"

# View patients
docker compose exec mongodb mongosh -u admin -p Checklistmapims@2026 --authenticationDatabase admin --eval "use mrd_audit; db.patients.countDocuments()"
```

## 💾 Backup Data

```powershell
# Backup entire database
docker compose exec mongodb mongodump -u admin -p Checklistmapims@2026 --authenticationDatabase admin --db mrd_audit --archive=/data/backup.archive

# Copy backup from container
docker cp mrd-mongodb:/data/backup.archive ./backup-$(Get-Date -Format 'yyyyMMdd').archive
```

## 🗑️ Clear Data (if needed)

```powershell
# Clear all data (keeps users and departments)
docker compose exec backend npm run clear-data

# Clear everything
docker compose exec backend npm run clear-db
```

## 📝 Data Source

The data you see was created by:
1. **Seed script**: `npm run seed` - Creates users, departments, basic checklist items
2. **Comprehensive seed**: `npm run seed:comprehensive` - Creates patients, admissions, submissions

## ✅ Your Current Data

From MongoDB Compass, you can see:
- **82 checklist items** across different departments
- Items are linked to departments and form templates
- Items have sections (like "ADMISSION")
- Response types (YES_NO, TEXT, etc.)
