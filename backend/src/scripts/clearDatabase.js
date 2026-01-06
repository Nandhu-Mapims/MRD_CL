const dotenv = require('dotenv');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Department = require('../models/Department');
const FormTemplate = require('../models/FormTemplate');
const ChecklistItem = require('../models/ChecklistItem');
const AuditSubmission = require('../models/AuditSubmission');
const User = require('../models/User');
const Patient = require('../models/Patient');

dotenv.config();

const RUN = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing ALL data from database...\n');

    // Count records before deletion
    const counts = {
      departments: await Department.countDocuments(),
      formTemplates: await FormTemplate.countDocuments(),
      checklistItems: await ChecklistItem.countDocuments(),
      auditSubmissions: await AuditSubmission.countDocuments(),
      patients: await Patient.countDocuments(),
      users: await User.countDocuments(),
    };

    console.log('📊 Current data counts:');
    console.log(`   - Departments: ${counts.departments}`);
    console.log(`   - Form Templates: ${counts.formTemplates}`);
    console.log(`   - Checklist Items: ${counts.checklistItems}`);
    console.log(`   - Audit Submissions: ${counts.auditSubmissions}`);
    console.log(`   - Patients: ${counts.patients}`);
    console.log(`   - Users: ${counts.users}\n`);

    console.log('⚠️  WARNING: This will delete ALL data including:');
    console.log('   - All audit submissions');
    console.log('   - All patients');
    console.log('   - All checklist items');
    console.log('   - All form templates');
    console.log('   - All departments');
    console.log('   - ALL users (including admins)\n');

    // Delete in order (respecting foreign key relationships)
    console.log('🗑️  Deleting data...\n');

    const deletedSubmissions = await AuditSubmission.deleteMany({});
    console.log(`✅ Deleted ${deletedSubmissions.deletedCount} audit submission(s)`);

    const deletedPatients = await Patient.deleteMany({});
    console.log(`✅ Deleted ${deletedPatients.deletedCount} patient(s)`);

    const deletedChecklistItems = await ChecklistItem.deleteMany({});
    console.log(`✅ Deleted ${deletedChecklistItems.deletedCount} checklist item(s)`);

    const deletedFormTemplates = await FormTemplate.deleteMany({});
    console.log(`✅ Deleted ${deletedFormTemplates.deletedCount} form template(s)`);

    const deletedDepartments = await Department.deleteMany({});
    console.log(`✅ Deleted ${deletedDepartments.deletedCount} department(s)`);

    // Delete ALL users (including admins)
    const deletedUsers = await User.deleteMany({});
    console.log(`✅ Deleted ${deletedUsers.deletedCount} user(s) (including admins)`);

    console.log('\n🎉 Database completely cleared!');
    console.log('\n📌 All data has been deleted. Run seed script to repopulate data.');
    console.log('   Command: npm run seed\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing database:', err);
    process.exit(1);
  }
};

RUN();


