const dotenv = require('dotenv');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Department = require('../models/Department');
const FormTemplate = require('../models/FormTemplate');
const ChecklistItem = require('../models/ChecklistItem');
const AuditSubmission = require('../models/AuditSubmission');
const Admission = require('../models/Admission');
const ChiefDoctor = require('../models/ChiefDoctor');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Notification = require('../models/Notification');

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
      admissions: await Admission.countDocuments(),
      chiefDoctors: await ChiefDoctor.countDocuments(),
      patients: await Patient.countDocuments(),
      users: await User.countDocuments(),
      notifications: await Notification.countDocuments(),
    };

    console.log('📊 Current data counts:');
    console.log(`   - Departments: ${counts.departments}`);
    console.log(`   - Form Templates: ${counts.formTemplates}`);
    console.log(`   - Checklist Items: ${counts.checklistItems}`);
    console.log(`   - Audit Submissions: ${counts.auditSubmissions}`);
    console.log(`   - Admissions: ${counts.admissions}`);
    console.log(`   - Chief Doctors: ${counts.chiefDoctors}`);
    console.log(`   - Patients: ${counts.patients}`);
    console.log(`   - Users: ${counts.users}`);
    console.log(`   - Notifications: ${counts.notifications}\n`);

    console.log('⚠️  WARNING: This will delete ALL data including:');
    console.log('   - All notifications');
    console.log('   - All audit submissions');
    console.log('   - All patients');
    console.log('   - All admissions');
    console.log('   - All checklist items');
    console.log('   - All form templates');
    console.log('   - All departments');
    console.log('   - All chief doctor records');
    console.log('   - ALL users (including admins)\n');

    // Delete in order (respecting foreign key relationships)
    console.log('🗑️  Deleting data...\n');

    const deletedNotifications = await Notification.deleteMany({});
    console.log(`✅ Deleted ${deletedNotifications.deletedCount} notification(s)`);

    const deletedSubmissions = await AuditSubmission.deleteMany({});
    console.log(`✅ Deleted ${deletedSubmissions.deletedCount} audit submission(s)`);

    const deletedPatients = await Patient.deleteMany({});
    console.log(`✅ Deleted ${deletedPatients.deletedCount} patient(s)`);

    const deletedAdmissions = await Admission.deleteMany({});
    console.log(`✅ Deleted ${deletedAdmissions.deletedCount} admission(s)`);

    const deletedChecklistItems = await ChecklistItem.deleteMany({});
    console.log(`✅ Deleted ${deletedChecklistItems.deletedCount} checklist item(s)`);

    const deletedFormTemplates = await FormTemplate.deleteMany({});
    console.log(`✅ Deleted ${deletedFormTemplates.deletedCount} form template(s)`);

    const deletedDepartments = await Department.deleteMany({});
    console.log(`✅ Deleted ${deletedDepartments.deletedCount} department(s)`);

    const deletedChiefDoctors = await ChiefDoctor.deleteMany({});
    console.log(`✅ Deleted ${deletedChiefDoctors.deletedCount} chief doctor record(s)`);

    // Delete ALL users (including admins)
    const deletedUsers = await User.deleteMany({});
    console.log(`✅ Deleted ${deletedUsers.deletedCount} user(s) (including admins)`);

    console.log('\n🎉 Database completely cleared!');
    console.log('   (Admin user will be re-created on next server start.)');
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


