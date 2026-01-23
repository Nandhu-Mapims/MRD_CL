# Reset Admin Password - Quick Fix

## 🔍 Issue

Getting **401 Unauthorized** even though database is seeded. This might be because:
1. Password hash doesn't match
2. User record has an issue

## ✅ Quick Fix: Reset Admin Password

Run this command to reset the admin password:

```powershell
docker compose exec backend node -e "const mongoose = require('mongoose'); const User = require('./src/models/User'); const bcrypt = require('bcrypt'); mongoose.connect(process.env.MONGO_URI).then(async () => { const user = await User.findOne({email: 'admin@hospital.com'}); if (user) { user.passwordHash = await bcrypt.hash('Admin@123', 10); await user.save(); console.log('✅ Admin password reset successfully'); } else { console.log('❌ Admin user not found'); } process.exit(0); });"
```

## 🧪 Test Login

After resetting, try logging in with:
- **Email**: `admin@hospital.com`
- **Password**: `Admin@123`

## 📋 Alternative: Re-seed Database

If reset doesn't work, clear and re-seed:

```powershell
# Clear users (keeps departments)
docker compose exec backend npm run clear-data

# Re-seed
docker compose exec backend npm run seed
```

## ✅ Verify

Check if admin user exists and is active:

```powershell
docker compose exec backend node -e "const mongoose = require('mongoose'); const User = require('./src/models/User'); mongoose.connect(process.env.MONGO_URI).then(async () => { const user = await User.findOne({email: 'admin@hospital.com'}); console.log('Admin user:', user ? 'Found' : 'Not found'); if (user) { console.log('Active:', user.isActive); console.log('Role:', user.role); } process.exit(0); });"
```
