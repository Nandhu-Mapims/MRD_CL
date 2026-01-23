# Seed Database - Quick Guide

## 🔍 Current Issue

You're getting **401 Unauthorized** errors because the database hasn't been seeded yet. There are no users in the database to authenticate against.

## ✅ Solution: Seed the Database

Run this command to create the initial data:

```powershell
docker compose exec backend npm run seed
```

This will create:
- ✅ Admin user: `admin@hospital.com` / `Admin@123`
- ✅ All departments (OG, GM, ORTHO, PED, OPHTHAL, CS, ENT, GS)
- ✅ Department users (one for each department)

## 📋 After Seeding

You can login with:
- **Email**: `admin@hospital.com`
- **Password**: `Admin@123`

## 🎯 Optional: Seed Test Data

If you want comprehensive test data (patients, admissions, submissions):

```powershell
docker compose exec backend npm run seed:comprehensive
```

This creates:
- 70 patients
- 112 admissions  
- 1,192 audit submissions
- Multi-department IPID scenarios

## ✅ Verify Seeding Worked

Check if users were created:

```powershell
docker compose exec backend node -e "const mongoose = require('mongoose'); const User = require('./src/models/User'); mongoose.connect(process.env.MONGO_URI).then(async () => { const users = await User.find(); console.log('Users:', users.length); users.forEach(u => console.log(u.email)); process.exit(0); });"
```

## 🎉 After Seeding

Try logging in again - the 401 error should be resolved!
