# Where is Your MongoDB Data Stored?

## 📍 Physical Location

Your MongoDB data is stored in **Docker volumes** on your Windows machine.

### Windows Path (via WSL)

```
\\wsl$\docker-desktop-data\data\docker\volumes\mrd_cl_mongodb_data\_data
```

### Access via Docker Desktop

1. Open **Docker Desktop**
2. Go to **Volumes** tab
3. Find `mrd_cl_mongodb_data`
4. Click on it to see the mount point

## 🔌 How You're Accessing It (MongoDB Compass)

You're connected via **MongoDB Compass** using:

**Connection String:**
```
mongodb://admin:Checklistmapims@2026@localhost:27017/mrd_audit?authSource=admin
```

**Connection Details:**
- **Host**: `localhost` (or `127.0.0.1`)
- **Port**: `27017`
- **Username**: `admin`
- **Password**: `Checklistmapims@2026`
- **Database**: `mrd_audit`
- **Auth Database**: `admin`

## 📊 Your Current Data

From MongoDB Compass, you can see:

### Collections:
- ✅ **checklistitems** - 82 documents (checklist items for forms)
- ✅ **formtemplates** - Form templates
- ✅ **users** - User accounts (admin + department users)
- ✅ **departments** - 10 departments
- ✅ **patients** - Patient records (if seeded)
- ✅ **admissions** - Admission records (if seeded)
- ✅ **auditsubmissions** - Audit submissions (if seeded)

## 🔍 View Data Counts

Run this to see all collections and their document counts:

```powershell
docker compose exec mongodb mongosh -u admin -p Checklistmapims@2026 --authenticationDatabase admin --eval "use mrd_audit; db.getCollectionNames().forEach(c => print(c + ': ' + db[c].countDocuments()))"
```

## 💾 Data Persistence

- ✅ Data persists in Docker volumes
- ✅ Survives container restarts
- ✅ Survives `docker compose down` (but not `docker compose down -v`)
- ✅ Accessible from MongoDB Compass, command line, or any MongoDB client

## 🎯 Summary

**Where**: Docker volume `mrd_cl_mongodb_data` on your Windows machine  
**How to Access**: MongoDB Compass (as you're doing) or command line  
**Database**: `mrd_audit`  
**Collections**: 7 collections with various documents

Your data is safe and persistent! 🎉
