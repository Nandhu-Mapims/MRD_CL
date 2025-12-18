const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const Department = require('../models/Department');
const ChecklistItem = require('../models/ChecklistItem');
const User = require('../models/User');

dotenv.config();

const DEPARTMENTS = [
  { name: 'Obstetrics & Gynecology', code: 'OG' },
  { name: 'General Medicine', code: 'GM' },
  { name: 'Orthopedics', code: 'ORTHO' },
  { name: 'Pediatrics', code: 'PED' },
  { name: 'Ophthalmology', code: 'OPHTHAL' },
  { name: 'Cardiac Surgery', code: 'CS' },
  { name: 'ENT', code: 'ENT' },
  { name: 'General Surgery', code: 'GS' },
  // Common departments
  { name: 'Anesthesiology (ANAE)', code: 'ANAE' },
  { name: 'Nursing Services (NUS)', code: 'NUS' },
];

// Removed common items - admin will create items through the form builder
// Items should only be assigned to specific departments or form templates

const RUN = async () => {
  try {
    await connectDB();

    // Create default admin user if it doesn't exist
    const adminEmail = 'admin@hospital.com';
    const adminPassword = 'Admin@123';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: 'System Administrator',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isActive: true,
      });
      console.log(`✅ Created main admin user:`);
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
    } else {
      console.log(`ℹ️  Main admin user already exists: ${adminEmail}`);
    }

    await Department.deleteMany({});
    await ChecklistItem.deleteMany({});

    const createdDepts = await Department.insertMany(DEPARTMENTS);
    console.log(`✅ Seeded ${createdDepts.length} departments`);

    // Create department-specific user accounts
    const departmentUsers = [];
    const clinicalDepts = createdDepts.filter(
      (d) => d.code !== 'ANAE' && d.code !== 'NUS'
    );

    for (const dept of clinicalDepts) {
      const deptEmail = `${dept.code.toLowerCase()}@hospital.com`;
      const deptPassword = `${dept.code}@123`;
      const existingDeptUser = await User.findOne({ email: deptEmail });

      if (!existingDeptUser) {
        const passwordHash = await bcrypt.hash(deptPassword, 10);
        await User.create({
          name: `${dept.name} User`,
          email: deptEmail,
          passwordHash,
          role: 'user',
          department: dept._id, // Assign department to user
          isActive: true,
        });
        departmentUsers.push({
          department: dept.name,
          code: dept.code,
          email: deptEmail,
          password: deptPassword,
        });
        console.log(`✅ Created user for ${dept.name} (${dept.code}) - Assigned to department`);
      } else {
        // Update existing user to assign department if not assigned
        if (!existingDeptUser.department) {
          existingDeptUser.department = dept._id;
          await existingDeptUser.save();
          console.log(`✅ Assigned department to existing user: ${deptEmail}`);
        }
        departmentUsers.push({
          department: dept.name,
          code: dept.code,
          email: deptEmail,
          password: deptPassword,
        });
        console.log(`ℹ️  User already exists for ${dept.name}: ${deptEmail}`);
      }
    }

    // Create users for common departments (ANAE, NUS)
    const anaDept = createdDepts.find((d) => d.code === 'ANAE');
    const nusDept = createdDepts.find((d) => d.code === 'NUS');

    if (anaDept) {
      const anaEmail = 'anae@hospital.com';
      const anaPassword = 'ANAE@123';
      const existingAna = await User.findOne({ email: anaEmail });
      if (!existingAna) {
        const passwordHash = await bcrypt.hash(anaPassword, 10);
        await User.create({
          name: 'Anesthesiology User',
          email: anaEmail,
          passwordHash,
          role: 'user',
          department: anaDept._id, // Assign department
          isActive: true,
        });
        console.log(`✅ Created user for ${anaDept.name} - Assigned to department`);
      } else {
        if (!existingAna.department) {
          existingAna.department = anaDept._id;
          await existingAna.save();
          console.log(`✅ Assigned department to existing user: ${anaEmail}`);
        }
        console.log(`ℹ️  User already exists for ${anaDept.name}: ${anaEmail}`);
      }
      departmentUsers.push({
        department: anaDept.name,
        code: 'ANAE',
        email: anaEmail,
        password: anaPassword,
      });
    }

    if (nusDept) {
      const nusEmail = 'nus@hospital.com';
      const nusPassword = 'NUS@123';
      const existingNus = await User.findOne({ email: nusEmail });
      if (!existingNus) {
        const passwordHash = await bcrypt.hash(nusPassword, 10);
        await User.create({
          name: 'Nursing Services User',
          email: nusEmail,
          passwordHash,
          role: 'user',
          department: nusDept._id, // Assign department
          isActive: true,
        });
        console.log(`✅ Created user for ${nusDept.name} - Assigned to department`);
      } else {
        if (!existingNus.department) {
          existingNus.department = nusDept._id;
          await existingNus.save();
          console.log(`✅ Assigned department to existing user: ${nusEmail}`);
        }
        console.log(`ℹ️  User already exists for ${nusDept.name}: ${nusEmail}`);
      }
      departmentUsers.push({
        department: nusDept.name,
        code: 'NUS',
        email: nusEmail,
        password: nusPassword,
      });
    }

    // Only create department-specific items - no common items
    // Admin will create forms and items through the form builder
    const items = [
      {
        label: 'Anesthesia machine check done',
        departmentScope: 'SINGLE',
        department: anaDept ? anaDept._id : undefined,
        isMandatory: true,
        order: 1,
      },
      {
        label: 'Nursing care plan updated within 24 hours',
        departmentScope: 'SINGLE',
        department: nusDept ? nusDept._id : undefined,
        isMandatory: true,
        order: 1,
      },
    ];

    const createdItems = await ChecklistItem.insertMany(items);
    console.log(`✅ Seeded ${createdItems.length} checklist items`);

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n👤 ADMIN ACCOUNT:');
    console.log(`   Email:    ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role:     Admin (Full Access)`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n👥 DEPARTMENT USER ACCOUNTS:');
    console.log('\n   Clinical Departments:');
    departmentUsers
      .filter((u) => u.code !== 'ANAE' && u.code !== 'NUS')
      .forEach((user) => {
        console.log(`\n   ${user.department} (${user.code}):`);
        console.log(`   Email:    ${user.email}`);
        console.log(`   Password: ${user.password}`);
      });
    console.log('\n   Common Departments:');
    departmentUsers
      .filter((u) => u.code === 'ANAE' || u.code === 'NUS')
      .forEach((user) => {
        console.log(`\n   ${user.department} (${user.code}):`);
        console.log(`   Email:    ${user.email}`);
        console.log(`   Password: ${user.password}`);
      });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  SECURITY NOTE:');
    console.log('   Please change all default passwords after first login!');
    console.log('\n📝 PASSWORD PATTERN:');
    console.log('   Admin:    Admin@123');
    console.log('   Users:    {DEPT_CODE}@123 (e.g., OG@123, GM@123)');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error', err);
    process.exit(1);
  }
};

RUN();


