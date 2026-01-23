# MongoDB Migration Guide
# Complete guide to migrate data from local MongoDB to Hostinger

## âœ… Step 1: Export Complete (Already Done!)

Your local MongoDB data has been exported successfully:
- Location: mongodb-backup-full\mrd_audit\
- Collections exported: 7 collections
- Total documents: ~1,507 documents

### Exported Collections:
- **users** (11 documents)
- **departments** (10 documents)  
- **formtemplates** (8 documents)
- **checklistitems** (82 documents)
- **patients** (70 documents)
- **admissions** (115 documents)
- **auditsubmissions** (1,211 documents)

## ðŸ“¤ Step 2: Transfer Backup to Hostinger

You need to upload the backup folder to your Hostinger server. Options:

### Option A: Using Hostinger File Manager
1. Log into Hostinger control panel
2. Go to File Manager
3. Navigate to your project directory
4. Upload the mongodb-backup-full folder

### Option B: Using SFTP/SCP
`ash
# From your local machine
scp -r mongodb-backup-full user@your-hostinger-ip:/path/to/project/
`

### Option C: Using Docker (if you have SSH access)
`ash
# Copy backup into Hostinger MongoDB container
docker cp mongodb-backup-full/mrd_audit mrd-mongodb:/data/backup/mrd_audit
`

## ðŸ“¥ Step 3: Import to Hostinger MongoDB

### Method 1: Using PowerShell Script (Recommended)

If you uploaded the backup to Hostinger and have PowerShell access:

`powershell
.\import-to-hostinger.ps1 
    -HostingerHost "194.238.22.210" 
    -HostingerPort "27017" 
    -MongoUser "admin" 
    -MongoPassword "YOUR_PASSWORD" 
    -BackupPath "mongodb-backup-full\mrd_audit"
`

**To drop existing data first:**
`powershell
.\import-to-hostinger.ps1 
    -HostingerHost "194.238.22.210" 
    -MongoPassword "YOUR_PASSWORD" 
    -DropExisting
`

### Method 2: Using Docker Exec (If backup is in container)

`ash
docker exec mrd-mongodb mongorestore \
  --host localhost \
  --port 27017 \
  --username admin \
  --password "YOUR_PASSWORD" \
  --authenticationDatabase admin \
  --db mrd_audit \
  --drop \
  /data/backup/mrd_audit
`

### Method 3: Using mongorestore directly

`ash
mongorestore \
  --host YOUR_HOSTINGER_IP \
  --port 27017 \
  --username admin \
  --password "YOUR_PASSWORD" \
  --authenticationDatabase admin \
  --db mrd_audit \
  --drop \
  mongodb-backup-full/mrd_audit
`

## ðŸ” Step 4: Verify Import

Connect to Hostinger MongoDB and verify:

`javascript
// Using mongosh
mongosh "mongodb://admin:YOUR_PASSWORD@YOUR_HOST:27017/mrd_audit?authSource=admin"

// Check document counts
use mrd_audit;
db.users.countDocuments();
db.departments.countDocuments();
db.auditsubmissions.countDocuments();
// Should match: 11, 10, 1211 respectively
`

## ðŸ“ Important Notes

1. **Password**: Replace YOUR_PASSWORD with your actual Hostinger MongoDB password
2. **Host**: Use your Hostinger server IP or container name
3. **Backup Location**: Ensure the backup path is correct
4. **Drop Existing**: Use --drop flag to replace existing data (be careful!)
5. **Network**: Ensure MongoDB port (27017) is accessible from your machine

## ðŸš¨ Troubleshooting

### Connection Refused
- Check if MongoDB port is exposed
- Verify firewall rules
- Check container is running: docker ps

### Authentication Failed
- Verify username and password
- Check uthSource=admin is in connection string
- Ensure user has proper permissions

### Import Errors
- Check backup files are complete
- Verify database name matches
- Check disk space on Hostinger server

## âœ… Success Indicators

After successful import, you should see:
- All 7 collections restored
- Document counts match your local database
- Can login with existing credentials
- All data accessible in application

