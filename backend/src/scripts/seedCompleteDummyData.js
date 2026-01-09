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

// Sample checklist items by section
const CHECKLIST_ITEMS_BY_SECTION = {
  'ADMISSION SLIP': [
    { label: 'Patient Name verified', isMandatory: true, order: 1 },
    { label: 'UHID Number correct', isMandatory: true, order: 2 },
    { label: 'Date of Admission recorded', isMandatory: true, order: 3 },
    { label: 'Ward/Bed number assigned', isMandatory: false, order: 4 },
    { label: 'Emergency contact information collected', isMandatory: true, order: 5 },
  ],
  'CONSENT': [
    { label: 'Informed consent obtained', isMandatory: true, order: 1 },
    { label: 'Consent form signed by patient/relative', isMandatory: true, order: 2 },
    { label: 'Witness present during consent', isMandatory: false, order: 3 },
    { label: 'Procedure explained clearly', isMandatory: true, order: 4 },
    { label: 'Risks and benefits discussed', isMandatory: true, order: 5 },
  ],
  'PRE-OPERATIVE': [
    { label: 'Pre-operative assessment completed', isMandatory: true, order: 1 },
    { label: 'Anesthesia evaluation done', isMandatory: true, order: 2 },
    { label: 'Laboratory reports reviewed', isMandatory: true, order: 3 },
    { label: 'Surgical site marked', isMandatory: true, order: 4 },
    { label: 'NPO status confirmed', isMandatory: true, order: 5 },
    { label: 'Allergies documented', isMandatory: true, order: 6 },
  ],
  'OT': [
    { label: 'Time out performed before procedure', isMandatory: true, order: 1 },
    { label: 'Correct patient identified', isMandatory: true, order: 2 },
    { label: 'Correct procedure site confirmed', isMandatory: true, order: 3 },
    { label: 'Correct procedure verified', isMandatory: true, order: 4 },
    { label: 'Equipment checked and functional', isMandatory: true, order: 5 },
  ],
  'POST-OPERATIVE': [
    { label: 'Post-operative instructions given', isMandatory: true, order: 1 },
    { label: 'Discharge summary prepared', isMandatory: true, order: 2 },
    { label: 'Medications prescribed', isMandatory: true, order: 3 },
    { label: 'Follow-up appointment scheduled', isMandatory: true, order: 4 },
  ],
};

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
    console.log('🚀 Starting complete dummy data seeding...\n');
    await connectDB();

    // Get all departments (excluding common ones)
    const departments = await Department.find({ 
      isActive: true,
      code: { $nin: ['ANAE', 'NUS'] }
    });
    
    if (departments.length === 0) {
      console.log('❌ No departments found. Please run seed.js first to create departments.');
      process.exit(1);
    }
    console.log(`✅ Found ${departments.length} departments`);

    // Get admin user
    const adminUser = await User.findOne({ role: 'admin', isActive: true });
    if (!adminUser) {
      console.log('❌ No admin user found. Please run seed.js first.');
      process.exit(1);
    }

    // Create forms for each department
    console.log('\n📋 Creating forms and checklist items...');
    const createdForms = [];

    for (const dept of departments.slice(0, 5)) { // Create forms for first 5 departments
      // Create form template
      let form = await FormTemplate.findOne({ 
        name: { $regex: dept.name, $options: 'i' },
        'departments': dept._id
      });

      if (!form) {
        const sections = Object.keys(CHECKLIST_ITEMS_BY_SECTION).map((sectionName, idx) => ({
          name: sectionName,
          order: idx,
          description: `${sectionName} section checklist items`,
        }));

        form = await FormTemplate.create({
          name: `${dept.name} - Case Sheet Audit Checklist`,
          description: `Comprehensive audit checklist for ${dept.name} department`,
          departments: [dept._id],
          isCommon: false,
          sections,
          isActive: true,
        });
        console.log(`   ✅ Created form: ${form.name}`);
      }

      createdForms.push({ form, department: dept });

      // Create checklist items for this form
      const existingItems = await ChecklistItem.countDocuments({ formTemplate: form._id });
      
      if (existingItems === 0) {
        let itemOrder = 1;
        for (const [sectionName, items] of Object.entries(CHECKLIST_ITEMS_BY_SECTION)) {
          for (const itemData of items) {
            await ChecklistItem.create({
              label: itemData.label,
              section: sectionName,
              departmentScope: 'SINGLE',
              department: dept._id,
              formTemplate: form._id,
              responseType: 'YES_NO',
              isActive: true,
              order: itemOrder++,
              isMandatory: itemData.isMandatory,
            });
          }
        }
        console.log(`   ✅ Created checklist items for ${form.name}`);
      }
    }

    console.log(`\n✅ Prepared ${createdForms.length} forms with checklist items`);

    // Now create dummy audit submissions
    console.log('\n📊 Creating dummy audit submissions...\n');

    let totalSubmissions = 0;
    let totalPatients = 0;
    let casesWith100Clearance = 0;

    for (const { form, department: dept } of createdForms) {
      // Get checklist items for this form
      const checklistItems = await ChecklistItem.find({
        formTemplate: form._id,
        isActive: true,
      }).sort({ order: 1 });

      if (checklistItems.length === 0) {
        console.log(`   ⚠️  Form "${form.name}" has no checklist items, skipping...`);
        continue;
      }

      // Create 8-15 cases per department
      const numCases = Math.floor(Math.random() * 8) + 8;
      console.log(`📋 ${dept.name} (${dept.code}) - Creating ${numCases} cases...`);

      for (let caseIndex = 0; caseIndex < numCases; caseIndex++) {
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
        for (const item of checklistItems) {
          // Force YES if this case should have 100% clearance
          const response = getRandomResponse(has100Clearance);
          const remarks = response === 'NO' ? generateRemarks() : '';
          const responsibility = response === 'NO' ? 'Quality Team' : '';
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
            responsibility,
            status,
            submittedBy: adminUser._id,
            submittedAt,
            isLocked: true, // All submissions are locked
          });
        }

        // Insert all submissions for this case
        await AuditSubmission.insertMany(submissions);
        totalSubmissions += submissions.length;
      }
      
      console.log(`   ✅ Completed ${numCases} cases for ${dept.name}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPLETE DUMMY DATA SEEDING FINISHED');
    console.log('='.repeat(60));
    console.log(`✅ Forms Created/Updated: ${createdForms.length}`);
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
    console.error(err.stack);
    process.exit(1);
  }
};

RUN();

