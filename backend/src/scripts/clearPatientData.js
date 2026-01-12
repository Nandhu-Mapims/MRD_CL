const dotenv = require('dotenv');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const AuditSubmission = require('../models/AuditSubmission');
const Patient = require('../models/Patient');

dotenv.config();

const RUN = async () => {
  try {
    await connectDB();

    console.log('🗑️  Clearing ALL patient data and submissions...\n');

    // Count records before deletion
    const patientCount = await Patient.countDocuments();
    const submissionCount = await AuditSubmission.countDocuments();

    console.log('📊 Current data counts:');
    console.log(`   - Patients: ${patientCount}`);
    console.log(`   - Audit Submissions: ${submissionCount}\n`);

    console.log('⚠️  WARNING: This will delete:');
    console.log('   - All audit submissions');
    console.log('   - All patient records\n');

    // Delete in order (respecting foreign key relationships)
    console.log('🗑️  Deleting data...\n');

    const deletedSubmissions = await AuditSubmission.deleteMany({});
    console.log(`✅ Deleted ${deletedSubmissions.deletedCount} audit submission(s)`);

    const deletedPatients = await Patient.deleteMany({});
    console.log(`✅ Deleted ${deletedPatients.deletedCount} patient(s)`);

    console.log('\n🎉 Patient data completely cleared!');
    console.log('\n📌 All patients and their submissions have been deleted.');
    console.log('   Departments, forms, checklist items, and users remain intact.\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing patient data:', err);
    process.exit(1);
  }
};

RUN();

