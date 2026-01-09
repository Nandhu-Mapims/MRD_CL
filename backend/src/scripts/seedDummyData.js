const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Department = require('../models/Department');
const FormTemplate = require('../models/FormTemplate');
const ChecklistItem = require('../models/ChecklistItem');
const AuditSubmission = require('../models/AuditSubmission');
const Patient = require('../models/Patient');
const User = require('../models/User');

dotenv.config();

// Sample patient names
const PATIENT_NAMES = [
  'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Deepa Singh', 'Vikram Mehta',
  'Anita Reddy', 'Kiran Desai', 'Manish Joshi', 'Sneha Gupta', 'Rahul Verma',
  'Sunita Agarwal', 'Arjun Malhotra', 'Pooja Khanna', 'Nikhil Kapoor', 'Meera Nair',
  'Suresh Iyer', 'Divya Menon', 'Ravi Shankar', 'Lakshmi Venkat', 'Gaurav Trivedi',
  'Neha Srinivasan', 'Karthik Raman', 'Swati Bhatt', 'Ankur Chaturvedi', 'Rekha Pandey'
];

// Generate random UHID
const generateUHID = (index) => {
  const year = new Date().getFullYear();
  const deptCode = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const serial = (index + 1).toString().padStart(6, '0');
  return `UH${year}${deptCode}${serial}`.toUpperCase();
};

// Random date within last 30 days
const getRandomDate = () => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  return date;
};

// Get random response (YES/NO/NA) - biased towards YES for 100% clearance demo
const getRandomResponse = (forceYes = false) => {
  if (forceYes) return 'YES';
  
  const rand = Math.random();
  // 60% YES, 25% NO, 15% NA
  if (rand < 0.60) return 'YES';
  if (rand < 0.85) return 'NO';
  return 'NA';
};

// Get random status
const getRandomStatus = () => {
  const rand = Math.random();
  // 40% CLOSED, 30% IN_PROGRESS, 30% OPEN
  if (rand < 0.40) return 'CLOSED';
  if (rand < 0.70) return 'IN_PROGRESS';
  return 'OPEN';
};

// Generate remarks for NO responses
const generateRemarks = () => {
  const remarks = [
    'Documentation pending',
    'Follow-up required',
    'Needs review',
    'Incomplete information',
    'Requires clarification',
    'Pending approval',
    'Under investigation',
    'Corrective action needed'
  ];
  return remarks[Math.floor(Math.random() * remarks.length)];
};

const RUN = async () => {
  try {
    console.log('🚀 Starting dummy data seeding...\n');
    await connectDB();

    // Get all departments
    const departments = await Department.find({ isActive: true });
    if (departments.length === 0) {
      console.log('❌ No departments found. Please run seed.js first to create departments.');
      process.exit(1);
    }
    console.log(`✅ Found ${departments.length} departments`);

    // Get all forms
    const forms = await FormTemplate.find({ isActive: true }).populate('departments');
    if (forms.length === 0) {
      console.log('❌ No forms found. Please create forms first.');
      process.exit(1);
    }
    console.log(`✅ Found ${forms.length} form templates`);

    // Get admin user
    const adminUser = await User.findOne({ role: 'admin', isActive: true });
    if (!adminUser) {
      console.log('❌ No admin user found. Please run seed.js first.');
      process.exit(1);
    }

    // Clear existing dummy data (optional - comment out if you want to keep existing data)
    const existingCount = await AuditSubmission.countDocuments();
    if (existingCount > 0) {
      console.log(`\n⚠️  Found ${existingCount} existing submissions.`);
      console.log('   Skipping deletion (comment out this check to delete existing data)');
    }

    let totalSubmissions = 0;
    let totalPatients = 0;
    let casesWith100Clearance = 0;

    // For each department
    for (const dept of departments) {
      if (dept.code === 'ANAE' || dept.code === 'NUS') continue; // Skip common departments
      
      console.log(`\n📋 Processing department: ${dept.name} (${dept.code})`);
      
      // Get forms assigned to this department
      const assignedForms = forms.filter(form => 
        form.departments.some(d => d._id.toString() === dept._id.toString()) || form.isCommon
      );

      if (assignedForms.length === 0) {
        console.log(`   ⚠️  No forms assigned to this department, skipping...`);
        continue;
      }

      // Create 5-15 cases per department
      const numCases = Math.floor(Math.random() * 11) + 5;
      console.log(`   📝 Creating ${numCases} cases...`);

      for (let caseIndex = 0; caseIndex < numCases; caseIndex++) {
        // Pick a random form for this case
        const form = assignedForms[Math.floor(Math.random() * assignedForms.length)];
        
        // Get checklist items for this form and department
        const checklistItems = await ChecklistItem.find({
          formTemplate: form._id,
          isActive: true,
        });

        if (checklistItems.length === 0) {
          console.log(`   ⚠️  Form "${form.name}" has no checklist items, skipping...`);
          continue;
        }

        // Create or find patient
        const uhid = generateUHID(totalPatients);
        const patientName = PATIENT_NAMES[totalPatients % PATIENT_NAMES.length];
        
        let patient = await Patient.findOne({ uhid });
        if (!patient) {
          patient = await Patient.create({
            uhid,
            patientName,
          });
          totalPatients++;
        }

        // Decide if this case should have 100% clearance (30% chance)
        const has100Clearance = Math.random() < 0.30;
        if (has100Clearance) casesWith100Clearance++;

        const submittedAt = getRandomDate();
        const submissions = [];

        // Create submissions for all checklist items
        for (let i = 0; i < checklistItems.length; i++) {
          const item = checklistItems[i];
          
          // Force YES if this case should have 100% clearance
          const response = getRandomResponse(has100Clearance);
          const remarks = response === 'NO' ? generateRemarks() : '';
          const status = has100Clearance && response === 'YES' 
            ? (Math.random() < 0.7 ? 'CLOSED' : getRandomStatus()) 
            : getRandomStatus();

          submissions.push({
            department: dept._id,
            formTemplate: form._id,
            patient: patient._id,
            uhid: patient.uhid,
            patientName: patient.patientName,
            checklistItemId: item._id,
            yesNoNa: response,
            responseValue: response,
            remarks,
            responsibility: response === 'NO' ? 'Quality Team' : '',
            status,
            submittedBy: adminUser._id,
            submittedAt,
            isLocked: true, // All submissions are locked
          });
        }

        // Insert all submissions for this case
        await AuditSubmission.insertMany(submissions);
        totalSubmissions += submissions.length;

        if ((caseIndex + 1) % 5 === 0) {
          process.stdout.write(`   ✓ Created ${caseIndex + 1}/${numCases} cases...\r`);
        }
      }
      
      console.log(`   ✅ Completed ${numCases} cases for ${dept.name}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DUMMY DATA SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Total Patients Created: ${totalPatients}`);
    console.log(`✅ Total Submissions Created: ${totalSubmissions}`);
    console.log(`✅ Cases with 100% Clearance: ${casesWith100Clearance}`);
    console.log(`✅ All submissions are LOCKED (non-editable)`);
    console.log('\n📌 Next Steps:');
    console.log('   1. Go to /admin/analytics to view clearance metrics');
    console.log('   2. Check 100% clearance tab to see departments with full compliance');
    console.log('   3. View raw data tab to see all submissions');
    console.log('   4. Test that submissions cannot be edited (locked)');
    console.log('\n🎉 Dummy data seeding successful!\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

RUN();

