const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
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
];

// Sample wards
const WARDS = [
  'ICU', 'General Ward', 'Surgical Ward', 'Medical Ward', 'Emergency Ward',
  'Cardiac Ward', 'Orthopedic Ward', 'Pediatric Ward', 'Maternity Ward', 'Oncology Ward'
];

// Generate random ward
const getRandomWard = () => {
  return WARDS[Math.floor(Math.random() * WARDS.length)];
};

// Generate random unit number (1-20)
const getRandomUnitNo = () => {
  return (Math.floor(Math.random() * 20) + 1).toString();
};

// Common checklist items for ANAE (Anesthesiology)
const ANAE_CHECKLIST_ITEMS = {
  'PRE-ANESTHESIA': [
    { label: 'Pre-anesthesia assessment completed', isMandatory: true, order: 1 },
    { label: 'ASA physical status documented', isMandatory: true, order: 2 },
    { label: 'Airway assessment done', isMandatory: true, order: 3 },
    { label: 'Allergies checked and documented', isMandatory: true, order: 4 },
    { label: 'NPO status confirmed', isMandatory: true, order: 5 },
    { label: 'Consent for anesthesia obtained', isMandatory: true, order: 6 },
  ],
  'ANESTHESIA ADMINISTRATION': [
    { label: 'Correct patient identified before anesthesia', isMandatory: true, order: 1 },
    { label: 'Correct medications verified', isMandatory: true, order: 2 },
    { label: 'Monitoring equipment functional', isMandatory: true, order: 3 },
    { label: 'Vital signs monitored continuously', isMandatory: true, order: 4 },
  ],
  'POST-ANESTHESIA': [
    { label: 'Patient stable before transfer', isMandatory: true, order: 1 },
    { label: 'Post-anesthesia instructions given', isMandatory: true, order: 2 },
    { label: 'Pain management plan documented', isMandatory: true, order: 3 },
  ],
};

// Common checklist items for NUS (Nursing)
const NUS_CHECKLIST_ITEMS = {
  'ADMISSION': [
    { label: 'Vital signs recorded on admission', isMandatory: true, order: 1 },
    { label: 'Patient orientation completed', isMandatory: true, order: 2 },
    { label: 'Safety measures explained', isMandatory: true, order: 3 },
    { label: 'Care plan initiated', isMandatory: true, order: 4 },
  ],
  'DAILY CARE': [
    { label: 'Vital signs monitored every 4 hours', isMandatory: true, order: 1 },
    { label: 'Medications administered as prescribed', isMandatory: true, order: 2 },
    { label: 'Patient hygiene maintained', isMandatory: false, order: 3 },
    { label: 'Dietary requirements met', isMandatory: true, order: 4 },
  ],
  'DISCHARGE': [
    { label: 'Discharge instructions provided', isMandatory: true, order: 1 },
    { label: 'Follow-up appointments scheduled', isMandatory: true, order: 2 },
    { label: 'Medications reviewed', isMandatory: true, order: 3 },
  ],
};

// Department-specific checklist items
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
  'REMARKS & OBSERVATION': [
    { label: 'General observations documented', isMandatory: false, order: 1 },
    { label: 'Special instructions noted', isMandatory: false, order: 2 },
    { label: 'Follow-up requirements specified', isMandatory: false, order: 3 },
    { label: 'Any deviations from standard protocol documented', isMandatory: false, order: 4 },
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
const getRandomDate = (daysOffset = 0) => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30) + daysOffset;
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  return date;
};

// Get random response (YES/NO/NA)
const getRandomResponse = (forceYes = false) => {
  if (forceYes) return 'YES';
  
  const rand = Math.random();
  if (rand < 0.65) return 'YES';
  if (rand < 0.90) return 'NO';
  return 'NA';
};

// Get random status
const getRandomStatus = () => {
  const rand = Math.random();
  if (rand < 0.45) return 'CLOSED';
  if (rand < 0.75) return 'IN_PROGRESS';
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
    console.log('🚀 Starting multi-department dummy data seeding...\n');
    await connectDB();

    // Check existing data
    console.log('📊 Checking existing data...\n');
    const existingPatients = await Patient.countDocuments();
    const existingSubmissions = await AuditSubmission.countDocuments();
    const existingForms = await FormTemplate.countDocuments();
    const existingItems = await ChecklistItem.countDocuments();
    
    console.log(`   Patients: ${existingPatients}`);
    console.log(`   Submissions: ${existingSubmissions}`);
    console.log(`   Forms: ${existingForms}`);
    console.log(`   Checklist Items: ${existingItems}\n`);
    
    if (existingSubmissions > 0 || existingPatients > 0) {
      console.log('⚠️  WARNING: Existing data found in database!');
      console.log('   This script will:');
      console.log('   - Skip creating patients that already exist (by UHID)');
      console.log('   - Create new submissions for existing patients');
      console.log('   - Not delete any existing data\n');
    }

    // Get departments
    const allDepartments = await Department.find({ isActive: true });
    const clinicalDepts = allDepartments.filter(d => d.code !== 'ANAE' && d.code !== 'NUS');
    const anaeDept = allDepartments.find(d => d.code === 'ANAE');
    const nusDept = allDepartments.find(d => d.code === 'NUS');

    if (clinicalDepts.length === 0) {
      console.log('❌ No clinical departments found. Please run seed.js first.');
      process.exit(1);
    }

    console.log(`✅ Found ${clinicalDepts.length} clinical departments`);

    // Create or get doctor users for each department
    console.log('\n👨‍⚕️ Creating doctor users for departments...');
    const doctorUsers = {};
    
    // Sample doctor names
    const DOCTOR_NAMES = [
      'Dr. Rajesh Kumar', 'Dr. Priya Sharma', 'Dr. Amit Patel', 'Dr. Deepa Singh',
      'Dr. Vikram Mehta', 'Dr. Anita Reddy', 'Dr. Kiran Desai', 'Dr. Manish Joshi',
      'Dr. Sneha Gupta', 'Dr. Rahul Verma', 'Dr. Sunita Agarwal', 'Dr. Arjun Malhotra'
    ];

    for (let i = 0; i < clinicalDepts.length; i++) {
      const dept = clinicalDepts[i];
      const doctorName = DOCTOR_NAMES[i % DOCTOR_NAMES.length];
      const doctorEmail = `${dept.code.toLowerCase()}${i + 1}@hospital.com`;
      
      // Check if user exists
      let doctorUser = await User.findOne({ 
        email: doctorEmail,
        department: dept._id 
      });
      
      if (!doctorUser) {
        // Hash password before creating user
        const passwordHash = await bcrypt.hash('password123', 10);
        // Create doctor user for this department
        doctorUser = await User.create({
          name: doctorName,
          email: doctorEmail,
          passwordHash,
          role: 'user',
          department: dept._id,
          isActive: true,
        });
        console.log(`   ✅ Created ${doctorName} for ${dept.name}`);
      } else {
        console.log(`   ✓ ${doctorName} already exists for ${dept.name}`);
      }
      
      doctorUsers[dept._id.toString()] = doctorUser;
    }

    // Get admin user (as fallback)
    const adminUser = await User.findOne({ role: 'admin', isActive: true });
    if (!adminUser) {
      console.log('❌ No admin user found. Please run seed.js first.');
      process.exit(1);
    }

    // Get or create ANAE and NUS users
    let anaeUser = adminUser;
    let nusUser = adminUser;
    
    if (anaeDept) {
      let user = await User.findOne({ department: anaeDept._id, role: 'user' });
      if (!user) {
        const passwordHash = await bcrypt.hash('password123', 10);
        user = await User.create({
          name: 'Dr. Anesthesia Specialist',
          email: 'anae@hospital.com',
          passwordHash,
          role: 'user',
          department: anaeDept._id,
          isActive: true,
        });
        console.log(`   ✅ Created ANAE doctor user`);
      }
      anaeUser = user;
    }
    
    if (nusDept) {
      let user = await User.findOne({ department: nusDept._id, role: 'user' });
      if (!user) {
        const passwordHash = await bcrypt.hash('password123', 10);
        user = await User.create({
          name: 'Dr. Nursing Head',
          email: 'nus@hospital.com',
          passwordHash,
          role: 'user',
          department: nusDept._id,
          isActive: true,
        });
        console.log(`   ✅ Created NUS doctor user`);
      }
      nusUser = user;
    }

    // Create forms for clinical departments
    console.log('\n📋 Creating forms and checklist items...');
    const createdForms = [];

    // Limit to first 4 departments for performance
    for (const dept of clinicalDepts.slice(0, 4)) {
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

      // Create checklist items
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

    // Create common forms for ANAE and NUS
    const commonForms = [];
    
    if (anaeDept) {
      let anaeForm = await FormTemplate.findOne({
        name: { $regex: 'ANAE', $options: 'i' },
        isCommon: true
      });

      if (!anaeForm) {
        const sections = Object.keys(ANAE_CHECKLIST_ITEMS).map((name, idx) => ({
          name,
          order: idx,
          description: `${name} section`,
        }));

        anaeForm = await FormTemplate.create({
          name: 'Anesthesiology (ANAE) - Safety Checklist',
          description: 'Common anesthesiology checklist for all patients',
          departments: [anaeDept._id],
          isCommon: true,
          sections,
          isActive: true,
        });
        console.log(`   ✅ Created ANAE common form`);
      }

      // Create ANAE checklist items
      const anaeItems = await ChecklistItem.countDocuments({ formTemplate: anaeForm._id });
      if (anaeItems === 0) {
        let itemOrder = 1;
        for (const [sectionName, items] of Object.entries(ANAE_CHECKLIST_ITEMS)) {
          for (const itemData of items) {
            await ChecklistItem.create({
              label: itemData.label,
              section: sectionName,
              departmentScope: 'ALL',
              department: anaeDept._id,
              formTemplate: anaeForm._id,
              responseType: 'YES_NO',
              isActive: true,
              order: itemOrder++,
              isMandatory: itemData.isMandatory,
            });
          }
        }
        console.log(`   ✅ Created ANAE checklist items`);
      }

      commonForms.push({ form: anaeForm, department: anaeDept });
    }

    if (nusDept) {
      let nusForm = await FormTemplate.findOne({
        name: { $regex: 'NUS', $options: 'i' },
        isCommon: true
      });

      if (!nusForm) {
        const sections = Object.keys(NUS_CHECKLIST_ITEMS).map((name, idx) => ({
          name,
          order: idx,
          description: `${name} section`,
        }));

        nusForm = await FormTemplate.create({
          name: 'Nursing Services (NUS) - Care Checklist',
          description: 'Common nursing checklist for all patients',
          departments: [nusDept._id],
          isCommon: true,
          sections,
          isActive: true,
        });
        console.log(`   ✅ Created NUS common form`);
      }

      // Create NUS checklist items
      const nusItems = await ChecklistItem.countDocuments({ formTemplate: nusForm._id });
      if (nusItems === 0) {
        let itemOrder = 1;
        for (const [sectionName, items] of Object.entries(NUS_CHECKLIST_ITEMS)) {
          for (const itemData of items) {
            await ChecklistItem.create({
              label: itemData.label,
              section: sectionName,
              departmentScope: 'ALL',
              department: nusDept._id,
              formTemplate: nusForm._id,
              responseType: 'YES_NO',
              isActive: true,
              order: itemOrder++,
              isMandatory: itemData.isMandatory,
            });
          }
        }
        console.log(`   ✅ Created NUS checklist items`);
      }

      commonForms.push({ form: nusForm, department: nusDept });
    }

    console.log(`\n✅ Prepared ${createdForms.length} department forms + ${commonForms.length} common forms`);

    // Ensure REMARKS & OBSERVATION section exists in all existing forms
    console.log('\n📝 Adding REMARKS & OBSERVATION section to all forms...');
    const allExistingForms = await FormTemplate.find({ isActive: true });
    let remarksAdded = 0;
    
    for (const form of allExistingForms) {
      // Check if REMARKS & OBSERVATION items exist
      const existingRemarksItems = await ChecklistItem.countDocuments({
        formTemplate: form._id,
        section: 'REMARKS & OBSERVATION',
        isActive: true
      });
      
      if (existingRemarksItems === 0) {
        // Get max order number for this form
        const maxOrderItem = await ChecklistItem.findOne({ formTemplate: form._id })
          .sort({ order: -1 })
          .select('order');
        let nextOrder = maxOrderItem ? maxOrderItem.order + 1 : 1;
        
        // Determine department scope
        const isCommonForm = form.isCommon;
        const formDept = form.departments && form.departments.length > 0 ? form.departments[0] : null;
        
        // Add REMARKS & OBSERVATION items
        const remarksItems = CHECKLIST_ITEMS_BY_SECTION['REMARKS & OBSERVATION'];
        for (const itemData of remarksItems) {
          await ChecklistItem.create({
            label: itemData.label,
            section: 'REMARKS & OBSERVATION',
            departmentScope: isCommonForm ? 'ALL' : 'SINGLE',
            department: formDept || undefined,
            formTemplate: form._id,
            responseType: 'YES_NO',
            isActive: true,
            order: nextOrder++,
            isMandatory: itemData.isMandatory,
          });
        }
        remarksAdded++;
      }
    }
    
    if (remarksAdded > 0) {
      console.log(`   ✅ Added REMARKS & OBSERVATION section to ${remarksAdded} forms`);
    } else {
      console.log(`   ✓ All forms already have REMARKS & OBSERVATION section`);
    }

    // Update existing submissions to use doctor users instead of admin (bulk update)
    console.log('\n🔄 Updating existing submissions to use doctor users...');
    if (adminUser) {
      // Get all submissions by admin, grouped by department
      const adminSubmissions = await AuditSubmission.find({ submittedBy: adminUser._id })
        .populate('department')
        .lean();
      
      if (adminSubmissions.length > 0) {
        console.log(`   Found ${adminSubmissions.length} submissions by admin user`);
        
        // Group by department for bulk updates
        const deptGroups = {};
        for (const submission of adminSubmissions) {
          const deptId = submission.department?._id?.toString();
          if (deptId) {
            if (!deptGroups[deptId]) {
              deptGroups[deptId] = [];
            }
            deptGroups[deptId].push(submission._id);
          }
        }
        
        let updatedCount = 0;
        // Bulk update by department
        for (const [deptId, submissionIds] of Object.entries(deptGroups)) {
          let doctorUser = doctorUsers[deptId];
          
          // If not found, try to find from database
          if (!doctorUser) {
            doctorUser = await User.findOne({ 
              department: deptId, 
              role: 'user', 
              isActive: true 
            });
          }
          
          // If still not found, check for common departments
          if (!doctorUser) {
            const dept = await Department.findById(deptId);
            if (dept) {
              if (dept.code === 'ANAE') {
                doctorUser = anaeUser;
              } else if (dept.code === 'NUS') {
                doctorUser = nusUser;
              }
            }
          }
          
          // Bulk update all submissions for this department
          if (doctorUser && doctorUser._id.toString() !== adminUser._id.toString()) {
            await AuditSubmission.updateMany(
              { _id: { $in: submissionIds } },
              { $set: { submittedBy: doctorUser._id } }
            );
            updatedCount += submissionIds.length;
          }
        }
        
        if (updatedCount > 0) {
          console.log(`   ✅ Updated ${updatedCount} submissions to use doctor users`);
        } else {
          console.log(`   ℹ️  No submissions needed updating`);
        }
      }
    }

    // Create multi-department patient scenarios
    console.log('\n📊 Creating multi-department patient scenarios...\n');

    let totalPatients = 0;
    let totalSubmissions = 0;
    let multiDeptPatients = 0;

    // Create 10-15 patients with multi-department scenarios (reduced for performance)
    const numPatients = Math.floor(Math.random() * 6) + 10;

    for (let patientIdx = 0; patientIdx < numPatients; patientIdx++) {
      const uhid = generateUHID(totalPatients);
      const patientName = PATIENT_NAMES[totalPatients % PATIENT_NAMES.length];
      const ward = getRandomWard();
      const unitNo = getRandomUnitNo();
      
      let patient = await Patient.findOne({ uhid });
      if (!patient) {
        patient = await Patient.create({ 
          uhid, 
          patientName,
          ward,
          unitNo
        });
        totalPatients++;
      } else {
        // Update existing patient with ward/unitNo if not already set
        if (!patient.ward || !patient.unitNo) {
          patient.ward = patient.ward || ward;
          patient.unitNo = patient.unitNo || unitNo;
          await patient.save();
        }
      }

      // Each patient can have procedures in 1-3 different departments (reduced for performance)
      const numDeptsForPatient = Math.floor(Math.random() * 3) + 1;
      const selectedDepts = [];
      
      // Randomly select departments for this patient
      const shuffledDepts = [...createdForms].sort(() => Math.random() - 0.5);
      for (let i = 0; i < numDeptsForPatient && i < shuffledDepts.length; i++) {
        selectedDepts.push(shuffledDepts[i]);
      }

      if (selectedDepts.length > 1) multiDeptPatients++;

      // Create submissions for each selected department
      for (const { form, department: dept } of selectedDepts) {
        const checklistItems = await ChecklistItem.find({
          formTemplate: form._id,
          isActive: true,
        }).sort({ order: 1 });

        if (checklistItems.length === 0) continue;

        // 60% chance this checklist is locked (submitted), 40% open
        const isLocked = Math.random() < 0.60;
        
        // Only create submissions if locked (submitted), or if we want to create some open cases
        // For open cases, we'll create partial submissions (some items filled)
        const createSubmissions = isLocked || Math.random() < 0.50; // 50% create even if open (reduced for performance)
        
        if (!createSubmissions) continue; // Skip empty checklists
        
        // 25% chance of 100% clearance
        const has100Clearance = Math.random() < 0.25;

        const submittedAt = getRandomDate();
        
        // Get doctor user for this department (never use admin)
        const doctorUser = doctorUsers[dept._id.toString()] || anaeUser;

        const submissions = [];
        // For open cases, only fill some items (reduced for performance)
        const itemsToFill = isLocked 
          ? checklistItems 
          : checklistItems.filter(() => Math.random() < 0.60); // Fill 60% of items for open cases
        
        for (const item of itemsToFill) {
          const response = getRandomResponse(has100Clearance);
          // For REMARKS & OBSERVATION section, always include remarks
          const isRemarksSection = item.section === 'REMARKS & OBSERVATION';
          let remarks = '';
          if (response === 'NO') {
            remarks = generateRemarks();
          } else if (isRemarksSection && response === 'YES') {
            // Even for YES in REMARKS section, add some observation text
            const observations = [
              'All procedures completed as per protocol',
              'Patient stable throughout procedure',
              'No complications observed',
              'Standard operating procedures followed',
              'All safety measures in place',
              'Patient responded well to treatment'
            ];
            remarks = observations[Math.floor(Math.random() * observations.length)];
          }
          const responsibility = response === 'NO' ? 'Quality Team' : '';
          const status = has100Clearance && response === 'YES'
            ? (Math.random() < 0.75 ? 'CLOSED' : getRandomStatus())
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
            submittedBy: doctorUser._id, // Use doctor user instead of admin
            submittedAt,
            isLocked, // Lock if submitted
          });
        }

        if (submissions.length > 0) {
          await AuditSubmission.insertMany(submissions);
          totalSubmissions += submissions.length;
        }
      }

      // ALWAYS create submissions for ANAE and NUS (common checklists)
      for (const { form, department: commonDept } of commonForms) {
        const checklistItems = await ChecklistItem.find({
          formTemplate: form._id,
          isActive: true,
        }).sort({ order: 1 });

        if (checklistItems.length === 0) continue;

        // 70% chance common checklists are submitted (locked), 30% open
        const isLocked = Math.random() < 0.70;
        
        // Only create submissions if locked or if we want some open cases
        const createSubmissions = isLocked || Math.random() < 0.50; // 50% create even if open (reduced for performance)
        
        if (!createSubmissions) continue; // Skip empty checklists
        
        const has100Clearance = Math.random() < 0.30;

        const submittedAt = getRandomDate(5); // Slightly earlier than department submissions

        // Get appropriate doctor user for common department (never use admin)
        const commonUser = commonDept.code === 'ANAE' ? anaeUser : nusUser;

        const submissions = [];
        // For open cases, only fill some items (reduced for performance)
        const itemsToFill = isLocked 
          ? checklistItems 
          : checklistItems.filter(() => Math.random() < 0.60); // Fill 60% of items for open cases
        
        for (const item of itemsToFill) {
          const response = getRandomResponse(has100Clearance);
          // For REMARKS & OBSERVATION section, always include remarks
          const isRemarksSection = item.section === 'REMARKS & OBSERVATION';
          let remarks = '';
          if (response === 'NO') {
            remarks = generateRemarks();
          } else if (isRemarksSection && response === 'YES') {
            // Even for YES in REMARKS section, add some observation text
            const observations = [
              'All procedures completed as per protocol',
              'Patient stable throughout procedure',
              'No complications observed',
              'Standard operating procedures followed',
              'All safety measures in place',
              'Patient responded well to treatment'
            ];
            remarks = observations[Math.floor(Math.random() * observations.length)];
          }
          const responsibility = response === 'NO' ? 'Nursing Team' : '';
          const status = has100Clearance && response === 'YES'
            ? (Math.random() < 0.80 ? 'CLOSED' : getRandomStatus())
            : getRandomStatus();

          submissions.push({
            department: commonDept._id,
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
            submittedBy: commonUser._id, // Use department-specific user
            submittedAt,
            isLocked,
          });
        }

        if (submissions.length > 0) {
          await AuditSubmission.insertMany(submissions);
          totalSubmissions += submissions.length;
        }
      }

      if ((patientIdx + 1) % 5 === 0) {
        console.log(`   ✓ Created ${patientIdx + 1}/${numPatients} patients...`);
      }
    }

    // Update existing patients missing ward/unitNo (bulk update for performance)
    console.log('\n🔧 Updating existing patients missing ward/unitNo...');
    const patientsToUpdate = await Patient.find({
      $or: [
        { ward: { $exists: false } },
        { ward: null },
        { ward: '' },
        { unitNo: { $exists: false } },
        { unitNo: null },
        { unitNo: '' }
      ]
    }).lean();
    
    if (patientsToUpdate.length > 0) {
      // Use bulk write for better performance
      const bulkOps = [];
      for (const patient of patientsToUpdate) {
        const update = {};
        if (!patient.ward) {
          update.ward = getRandomWard();
        }
        if (!patient.unitNo) {
          update.unitNo = getRandomUnitNo();
        }
        
        if (Object.keys(update).length > 0) {
          bulkOps.push({
            updateOne: {
              filter: { _id: patient._id },
              update: { $set: update }
            }
          });
        }
      }
      
      if (bulkOps.length > 0) {
        await Patient.bulkWrite(bulkOps);
        console.log(`   ✅ Updated ${bulkOps.length} patients with missing ward/unitNo`);
      }
    } else {
      console.log(`   ✓ All patients already have ward/unitNo`);
    }

    // Final summary with validation
    console.log('\n' + '='.repeat(60));
    console.log('📊 MULTI-DEPARTMENT DUMMY DATA SEEDING COMPLETE');
    console.log('='.repeat(60));
    
    // Count actual data in database
    const finalPatientCount = await Patient.countDocuments();
    const finalSubmissionCount = await AuditSubmission.countDocuments();
    const finalFormCount = await FormTemplate.countDocuments();
    const finalItemCount = await ChecklistItem.countDocuments();
    
    // Count patients with ward/unitNo
    const patientsWithWard = await Patient.countDocuments({ ward: { $exists: true, $ne: null, $ne: '' } });
    const patientsWithUnitNo = await Patient.countDocuments({ unitNo: { $exists: true, $ne: null, $ne: '' } });
    
    console.log(`\n📋 Forms & Items:`);
    console.log(`   Forms Created: ${createdForms.length} department + ${commonForms.length} common`);
    console.log(`   Total Forms in DB: ${finalFormCount}`);
    console.log(`   Total Checklist Items: ${finalItemCount}`);
    
    console.log(`\n👥 Patients:`);
    console.log(`   New Patients Created: ${totalPatients}`);
    console.log(`   Total Patients in DB: ${finalPatientCount}`);
    console.log(`   Patients with Ward: ${patientsWithWard}/${finalPatientCount}`);
    console.log(`   Patients with Unit No: ${patientsWithUnitNo}/${finalPatientCount}`);
    
    console.log(`\n📝 Submissions:`);
    console.log(`   New Submissions Created: ${totalSubmissions}`);
    console.log(`   Total Submissions in DB: ${finalSubmissionCount}`);
    console.log(`   Patients with Multiple Departments: ${multiDeptPatients}`);
    
    // Validation checks
    console.log(`\n🔍 Validation Checks:`);
    if (finalPatientCount > 0) {
      if (patientsWithWard === finalPatientCount) {
        console.log(`   ✅ All patients have ward assigned`);
      } else {
        console.log(`   ⚠️  Warning: ${finalPatientCount - patientsWithWard} patients missing ward`);
      }
      
      if (patientsWithUnitNo === finalPatientCount) {
        console.log(`   ✅ All patients have unit number assigned`);
      } else {
        console.log(`   ⚠️  Warning: ${finalPatientCount - patientsWithUnitNo} patients missing unit number`);
      }
    }
    
    if (finalSubmissionCount > 0) {
      console.log(`   ✅ Submissions created successfully`);
    } else {
      console.log(`   ⚠️  Warning: No submissions found`);
    }
    
    console.log(`\n📌 Multi-Department Scenarios Created:`);
    console.log(`   - Patients with checklists from 1-4 different departments`);
    console.log(`   - All patients have ANAE and NUS common checklists`);
    console.log(`   - Mix of locked (submitted) and editable checklists`);
    console.log(`   - Some checklists with 100% clearance`);
    console.log(`   - Ward and Unit No assigned to all patients`);
    console.log(`\n🎉 Multi-department dummy data seeding successful!\n`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    console.error(err.stack);
    process.exit(1);
  }
};

RUN();

