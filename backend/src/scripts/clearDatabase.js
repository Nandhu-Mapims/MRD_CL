const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Department = require('../models/Department');
const FormTemplate = require('../models/FormTemplate');
const ChecklistItem = require('../models/ChecklistItem');
const AuditSubmission = require('../models/AuditSubmission');
const User = require('../models/User');

dotenv.config();

const RUN = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing all data from database...\n');

    // Count records before deletion
    const counts = {
      departments: await Department.countDocuments(),
      formTemplates: await FormTemplate.countDocuments(),
      checklistItems: await ChecklistItem.countDocuments(),
      auditSubmissions: await AuditSubmission.countDocuments(),
      users: await User.countDocuments(),
    };

    console.log('📊 Current data counts:');
    console.log(`   - Departments: ${counts.departments}`);
    console.log(`   - Form Templates: ${counts.formTemplates}`);
    console.log(`   - Checklist Items: ${counts.checklistItems}`);
    console.log(`   - Audit Submissions: ${counts.auditSubmissions}`);
    console.log(`   - Users: ${counts.users}\n`);

    // Delete in order (respecting foreign key relationships)
    console.log('🗑️  Deleting data...\n');

    const deletedSubmissions = await AuditSubmission.deleteMany({});
    console.log(`✅ Deleted ${deletedSubmissions.deletedCount} audit submission(s)`);

    const deletedChecklistItems = await ChecklistItem.deleteMany({});
    console.log(`✅ Deleted ${deletedChecklistItems.deletedCount} checklist item(s)`);

    const deletedFormTemplates = await FormTemplate.deleteMany({});
    console.log(`✅ Deleted ${deletedFormTemplates.deletedCount} form template(s)`);

    const deletedDepartments = await Department.deleteMany({});
    console.log(`✅ Deleted ${deletedDepartments.deletedCount} department(s)`);

    // Keep admin users, delete only regular users
    const deletedUsers = await User.deleteMany({ role: 'user' });
    console.log(`✅ Deleted ${deletedUsers.deletedCount} user(s) (admin users preserved)`);

    console.log('\n🎉 Database cleared successfully!');
    console.log('\n📌 Note: Admin users are preserved. Run seed script to repopulate data.');
    console.log('   Command: npm run seed\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing database:', err);
    process.exit(1);
  }
};

RUN();


