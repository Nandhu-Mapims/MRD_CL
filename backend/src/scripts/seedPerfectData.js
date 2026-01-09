/**
 * Comprehensive Perfect Data Seed Script
 * 
 * This script creates realistic dummy data that matches the exact structure
 * expected by the application controllers and models.
 * 
 * Key Requirements (based on codebase analysis):
 * - All audit submissions are locked by default (isLocked: true)
 * - Patients must have ward and unitNo (required fields)
 * - responseValue must match yesNoNa for consistency
 * - Submissions must have proper relationships (department, formTemplate, patient, checklistItemId, submittedBy)
 * - Form templates must have proper sections with order
 * - Checklist items must be linked to form templates
 * - Department scope: SINGLE for department-specific, ALL for common forms (ANAE, NUS)
 * - Users must be properly assigned to departments
 */

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

// Comprehensive patient data with realistic information
const PATIENT_DATA = [
  { name: 'Rajesh Kumar', gender: 'Male', dob: '1985-03-15', contact: '9876543210', address: '123 MG Road, Bangalore' },
  { name: 'Priya Sharma', gender: 'Female', dob: '1990-07-22', contact: '9876543211', address: '456 Brigade Road, Bangalore' },
  { name: 'Amit Patel', gender: 'Male', dob: '1988-11-08', contact: '9876543212', address: '789 Indiranagar, Bangalore' },
  { name: 'Deepa Singh', gender: 'Female', dob: '1992-05-14', contact: '9876543213', address: '321 Koramangala, Bangalore' },
  { name: 'Vikram Mehta', gender: 'Male', dob: '1987-09-30', contact: '9876543214', address: '654 Whitefield, Bangalore' },
  { name: 'Anita Reddy', gender: 'Female', dob: '1991-12-25', contact: '9876543215', address: '147 Jayanagar, Bangalore' },
  { name: 'Kiran Desai', gender: 'Male', dob: '1986-02-18', contact: '9876543216', address: '258 Malleswaram, Bangalore' },
  { name: 'Manish Joshi', gender: 'Male', dob: '1989-06-11', contact: '9876543217', address: '369 Basavanagudi, Bangalore' },
  { name: 'Sneha Gupta', gender: 'Female', dob: '1993-08-05', contact: '9876543218', address: '741 Banashankari, Bangalore' },
  { name: 'Rahul Verma', gender: 'Male', dob: '1984-04-20', contact: '9876543219', address: '852 Hebbal, Bangalore' },
  { name: 'Sunita Agarwal', gender: 'Female', dob: '1990-10-12', contact: '9876543220', address: '963 Marathahalli, Bangalore' },
  { name: 'Arjun Malhotra', gender: 'Male', dob: '1987-01-28', contact: '9876543221', address: '159 HSR Layout, Bangalore' },
  { name: 'Pooja Khanna', gender: 'Female', dob: '1992-03-17', contact: '9876543222', address: '357 BTM Layout, Bangalore' },
  { name: 'Nikhil Kapoor', gender: 'Male', dob: '1988-07-09', contact: '9876543223', address: '468 Electronic City, Bangalore' },
  { name: 'Meera Nair', gender: 'Female', dob: '1991-11-23', contact: '9876543224', address: '579 Yelahanka, Bangalore' },
  { name: 'Suresh Iyer', gender: 'Male', dob: '1985-05-16', contact: '9876543225', address: '680 Rajajinagar, Bangalore' },
  { name: 'Divya Menon', gender: 'Female', dob: '1989-09-04', contact: '9876543226', address: '791 Vijayanagar, Bangalore' },
  { name: 'Ravi Shankar', gender: 'Male', dob: '1986-12-19', contact: '9876543227', address: '802 Chamrajpet, Bangalore' },
  { name: 'Lakshmi Venkat', gender: 'Female', dob: '1990-02-07', contact: '9876543228', address: '913 Frazer Town, Bangalore' },
  { name: 'Gaurav Trivedi', gender: 'Male', dob: '1987-06-13', contact: '9876543229', address: '124 Ulsoor, Bangalore' },
  { name: 'Neha Srinivasan', gender: 'Female', dob: '1992-10-29', contact: '9876543230', address: '235 RT Nagar, Bangalore' },
  { name: 'Karthik Raman', gender: 'Male', dob: '1988-04-02', contact: '9876543231', address: '346 Sanjay Nagar, Bangalore' },
  { name: 'Swati Bhatt', gender: 'Female', dob: '1991-08-26', contact: '9876543232', address: '457 Domlur, Bangalore' },
  { name: 'Ankur Chaturvedi', gender: 'Male', dob: '1989-01-14', contact: '9876543233', address: '568 CV Raman Nagar, Bangalore' },
  { name: 'Rekha Pandey', gender: 'Female', dob: '1986-05-31', contact: '9876543234', address: '679 Old Airport Road, Bangalore' },
];

// Realistic wards
const WARDS = [
  'ICU', 'General Ward', 'Surgical Ward', 'Medical Ward', 'Emergency Ward',
  'Cardiac Ward', 'Orthopedic Ward', 'Pediatric Ward', 'Maternity Ward', 
  'Oncology Ward', 'Neurology Ward', 'ENT Ward', 'Ophthalmology Ward'
];

// Comprehensive checklist items by section
const CHECKLIST_ITEMS_BY_SECTION = {
  'ADMISSION SLIP': [
    { label: 'Patient Name verified with ID proof', isMandatory: true, order: 1 },
    { label: 'UHID Number correct and verified', isMandatory: true, order: 2 },
    { label: 'Date of Admission recorded accurately', isMandatory: true, order: 3 },
    { label: 'Ward/Bed number assigned and documented', isMandatory: true, order: 4 },
    { label: 'Emergency contact information collected and verified', isMandatory: true, order: 5 },
    { label: 'Insurance details verified (if applicable)', isMandatory: false, order: 6 },
    { label: 'Admission slip signed by admitting doctor', isMandatory: true, order: 7 },
  ],
  'CONSENT': [
    { label: 'Informed consent obtained from patient/relative', isMandatory: true, order: 1 },
    { label: 'Consent form signed by patient/relative', isMandatory: true, order: 2 },
    { label: 'Witness present during consent process', isMandatory: true, order: 3 },
    { label: 'Procedure explained clearly to patient/relative', isMandatory: true, order: 4 },
    { label: 'Risks and benefits discussed in detail', isMandatory: true, order: 5 },
    { label: 'Alternative treatment options explained', isMandatory: false, order: 6 },
    { label: 'Consent form dated and time-stamped', isMandatory: true, order: 7 },
  ],
  'PRE-OPERATIVE': [
    { label: 'Pre-operative assessment completed by surgeon', isMandatory: true, order: 1 },
    { label: 'Anesthesia evaluation done and documented', isMandatory: true, order: 2 },
    { label: 'Laboratory reports reviewed and normal', isMandatory: true, order: 3 },
    { label: 'Surgical site marked by surgeon', isMandatory: true, order: 4 },
    { label: 'NPO status confirmed (Nil by mouth)', isMandatory: true, order: 5 },
    { label: 'Allergies documented and verified', isMandatory: true, order: 6 },
    { label: 'Pre-operative medications administered as ordered', isMandatory: true, order: 7 },
    { label: 'Blood grouping and cross-matching done (if required)', isMandatory: false, order: 8 },
    { label: 'ECG and Chest X-ray reviewed (if required)', isMandatory: false, order: 9 },
  ],
  'OT': [
    { label: 'Time out performed before procedure start', isMandatory: true, order: 1 },
    { label: 'Correct patient identified using two identifiers', isMandatory: true, order: 2 },
    { label: 'Correct procedure site confirmed and marked', isMandatory: true, order: 3 },
    { label: 'Correct procedure verified with consent form', isMandatory: true, order: 4 },
    { label: 'Equipment checked and functional', isMandatory: true, order: 5 },
    { label: 'Surgical team members identified', isMandatory: true, order: 6 },
    { label: 'Antibiotic prophylaxis given (if required)', isMandatory: false, order: 7 },
    { label: 'Positioning of patient verified', isMandatory: true, order: 8 },
  ],
  'POST-OPERATIVE': [
    { label: 'Post-operative instructions given to patient/relative', isMandatory: true, order: 1 },
    { label: 'Discharge summary prepared and signed', isMandatory: true, order: 2 },
    { label: 'Medications prescribed with dosage instructions', isMandatory: true, order: 3 },
    { label: 'Follow-up appointment scheduled', isMandatory: true, order: 4 },
    { label: 'Wound care instructions provided', isMandatory: true, order: 5 },
    { label: 'Dietary restrictions explained', isMandatory: false, order: 6 },
    { label: 'Activity restrictions explained', isMandatory: false, order: 7 },
  ],
  'REMARKS & OBSERVATION': [
    { label: 'General observations documented in case sheet', isMandatory: false, order: 1 },
    { label: 'Special instructions noted and communicated', isMandatory: false, order: 2 },
    { label: 'Follow-up requirements specified clearly', isMandatory: false, order: 3 },
    { label: 'Any deviations from standard protocol documented', isMandatory: false, order: 4 },
    { label: 'Patient condition at discharge documented', isMandatory: false, order: 5 },
  ],
};

// ANAE (Anesthesiology) specific checklist
const ANAE_CHECKLIST_ITEMS = {
  'PRE-ANESTHESIA': [
    { label: 'Pre-anesthesia assessment completed', isMandatory: true, order: 1 },
    { label: 'ASA physical status documented', isMandatory: true, order: 2 },
    { label: 'Airway assessment done and documented', isMandatory: true, order: 3 },
    { label: 'Allergies checked and documented', isMandatory: true, order: 4 },
    { label: 'NPO status confirmed', isMandatory: true, order: 5 },
    { label: 'Consent for anesthesia obtained', isMandatory: true, order: 6 },
    { label: 'Anesthesia plan discussed with patient', isMandatory: true, order: 7 },
  ],
  'ANESTHESIA ADMINISTRATION': [
    { label: 'Correct patient identified before anesthesia', isMandatory: true, order: 1 },
    { label: 'Correct medications verified and checked', isMandatory: true, order: 2 },
    { label: 'Monitoring equipment functional and calibrated', isMandatory: true, order: 3 },
    { label: 'Vital signs monitored continuously', isMandatory: true, order: 4 },
    { label: 'Anesthesia record maintained throughout procedure', isMandatory: true, order: 5 },
  ],
  'POST-ANESTHESIA': [
    { label: 'Patient stable before transfer to recovery', isMandatory: true, order: 1 },
    { label: 'Post-anesthesia instructions given', isMandatory: true, order: 2 },
    { label: 'Pain management plan documented', isMandatory: true, order: 3 },
    { label: 'Recovery room monitoring completed', isMandatory: true, order: 4 },
  ],
};

// NUS (Nursing) specific checklist
const NUS_CHECKLIST_ITEMS = {
  'ADMISSION': [
    { label: 'Vital signs recorded on admission', isMandatory: true, order: 1 },
    { label: 'Patient orientation completed', isMandatory: true, order: 2 },
    { label: 'Safety measures explained to patient', isMandatory: true, order: 3 },
    { label: 'Care plan initiated and documented', isMandatory: true, order: 4 },
    { label: 'Baseline assessment completed', isMandatory: true, order: 5 },
  ],
  'DAILY CARE': [
    { label: 'Vital signs monitored every 4 hours', isMandatory: true, order: 1 },
    { label: 'Medications administered as prescribed', isMandatory: true, order: 2 },
    { label: 'Patient hygiene maintained', isMandatory: true, order: 3 },
    { label: 'Dietary requirements met', isMandatory: true, order: 4 },
    { label: 'Nursing notes updated regularly', isMandatory: true, order: 5 },
  ],
  'DISCHARGE': [
    { label: 'Discharge instructions provided to patient', isMandatory: true, order: 1 },
    { label: 'Follow-up appointments scheduled', isMandatory: true, order: 2 },
    { label: 'Medications reviewed and explained', isMandatory: true, order: 3 },
    { label: 'Discharge summary handed over to patient', isMandatory: true, order: 4 },
  ],
};

// Generate unique UHID
const generateUHID = (index) => {
  const year = new Date().getFullYear();
  const serial = (index + 1).toString().padStart(6, '0');
  return `UH${year}${serial}`.toUpperCase();
};

// Get random date within last 60 days
const getRandomDate = (daysOffset = 0) => {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 60) + daysOffset;
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  return date;
};

// Get random response (YES/NO/NA) - realistic distribution
const getRandomResponse = (forceYes = false) => {
  if (forceYes) return 'YES';
  
  const rand = Math.random();
  // 70% YES, 20% NO, 10% NA - realistic hospital compliance
  if (rand < 0.70) return 'YES';
  if (rand < 0.90) return 'NO';
  return 'NA';
};

// Get random status
const getRandomStatus = () => {
  const rand = Math.random();
  // 50% CLOSED, 30% IN_PROGRESS, 20% OPEN
  if (rand < 0.50) return 'CLOSED';
  if (rand < 0.80) return 'IN_PROGRESS';
  return 'OPEN';
};

// Generate realistic remarks
const generateRemarks = (section = '') => {
  const generalRemarks = [
    'Documentation pending - will be completed by end of day',
    'Follow-up required with senior consultant',
    'Needs review by quality team',
    'Incomplete information - awaiting patient response',
    'Requires clarification from attending doctor',
    'Pending approval from department head',
    'Under investigation - corrective action in progress',
    'Corrective action needed - assigned to quality team',
  ];
  
  const sectionSpecificRemarks = {
    'CONSENT': [
      'Consent form needs to be re-signed with witness',
      'Patient requested additional time to review consent',
      'Relative consent pending - patient under anesthesia',
    ],
    'PRE-OPERATIVE': [
      'Lab reports pending - procedure scheduled after results',
      'Anesthesia clearance pending',
      'Pre-operative checklist incomplete',
    ],
    'OT': [
      'Time out delayed due to emergency case',
      'Equipment check in progress',
      'Surgical team verification pending',
    ],
    'POST-OPERATIVE': [
      'Discharge summary being prepared',
      'Follow-up appointment scheduling in progress',
      'Medication reconciliation pending',
    ],
  };
  
  const remarks = sectionSpecificRemarks[section] || generalRemarks;
  return remarks[Math.floor(Math.random() * remarks.length)];
};

// Get random ward
const getRandomWard = () => {
  return WARDS[Math.floor(Math.random() * WARDS.length)];
};

// Get random unit number (1-30)
const getRandomUnitNo = () => {
  return (Math.floor(Math.random() * 30) + 1).toString();
};

const RUN = async () => {
  try {
    console.log('🚀 Starting comprehensive perfect data seeding...\n');
    await connectDB();

    // Step 1: Ensure departments and users exist
    console.log('📋 Step 1: Checking departments and users...');
    let departments = await Department.find({ isActive: true });
    
    if (departments.length === 0) {
      console.log('   ⚠️  No departments found. Creating departments...');
      const DEPARTMENTS = [
        { name: 'Obstetrics & Gynecology', code: 'OG' },
        { name: 'General Medicine', code: 'GM' },
        { name: 'Orthopedics', code: 'ORTHO' },
        { name: 'Pediatrics', code: 'PED' },
        { name: 'Ophthalmology', code: 'OPHTHAL' },
        { name: 'Cardiac Surgery', code: 'CS' },
        { name: 'ENT', code: 'ENT' },
        { name: 'General Surgery', code: 'GS' },
        { name: 'Anesthesiology (ANAE)', code: 'ANAE' },
        { name: 'Nursing Services (NUS)', code: 'NUS' },
      ];
      departments = await Department.insertMany(DEPARTMENTS);
      console.log(`   ✅ Created ${departments.length} departments`);
    } else {
      console.log(`   ✅ Found ${departments.length} existing departments`);
    }

    // Ensure admin user exists
    let adminUser = await User.findOne({ role: 'admin', isActive: true });
    if (!adminUser) {
      const passwordHash = await bcrypt.hash('Admin@123', 10);
      adminUser = await User.create({
        name: 'System Administrator',
        email: 'admin@hospital.com',
        passwordHash,
        role: 'admin',
        isActive: true,
      });
      console.log('   ✅ Created admin user');
    } else {
      console.log('   ✅ Admin user exists');
    }

    // Ensure department users exist
    const clinicalDepts = departments.filter(d => d.code !== 'ANAE' && d.code !== 'NUS');
    const anaeDept = departments.find(d => d.code === 'ANAE');
    const nusDept = departments.find(d => d.code === 'NUS');

    console.log('\n👥 Step 2: Ensuring department users exist...');
    const doctorUsers = {};

    for (const dept of clinicalDepts) {
      const doctorEmail = `${dept.code.toLowerCase()}@hospital.com`;
      let doctorUser = await User.findOne({ email: doctorEmail });
      
      if (!doctorUser) {
        const passwordHash = await bcrypt.hash(`${dept.code}@123`, 10);
        doctorUser = await User.create({
          name: `Dr. ${dept.name} Specialist`,
          email: doctorEmail,
          passwordHash,
          role: 'user',
          department: dept._id,
          isActive: true,
        });
        console.log(`   ✅ Created user for ${dept.name}`);
      }
      doctorUsers[dept._id.toString()] = doctorUser;
    }

    // ANAE and NUS users
    let anaeUser = adminUser;
    let nusUser = adminUser;

    if (anaeDept) {
      let user = await User.findOne({ department: anaeDept._id, role: 'user' });
      if (!user) {
        const passwordHash = await bcrypt.hash('ANAE@123', 10);
        user = await User.create({
          name: 'Dr. Anesthesia Specialist',
          email: 'anae@hospital.com',
          passwordHash,
          role: 'user',
          department: anaeDept._id,
          isActive: true,
        });
        console.log('   ✅ Created ANAE user');
      }
      anaeUser = user;
    }

    if (nusDept) {
      let user = await User.findOne({ department: nusDept._id, role: 'user' });
      if (!user) {
        const passwordHash = await bcrypt.hash('NUS@123', 10);
        user = await User.create({
          name: 'Dr. Nursing Head',
          email: 'nus@hospital.com',
          passwordHash,
          role: 'user',
          department: nusDept._id,
          isActive: true,
        });
        console.log('   ✅ Created NUS user');
      }
      nusUser = user;
    }

    // Step 3: Create form templates and checklist items
    console.log('\n📋 Step 3: Creating form templates and checklist items...');
    const createdForms = [];

    // Create forms for clinical departments (first 6 for comprehensive data)
    for (const dept of clinicalDepts.slice(0, 6)) {
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
        console.log('   ✅ Created ANAE common form');
      }

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
        console.log('   ✅ Created ANAE checklist items');
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
        console.log('   ✅ Created NUS common form');
      }

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
        console.log('   ✅ Created NUS checklist items');
      }

      commonForms.push({ form: nusForm, department: nusDept });
    }

    console.log(`\n✅ Prepared ${createdForms.length} department forms + ${commonForms.length} common forms`);

    // Step 4: Create comprehensive patient data
    console.log('\n👥 Step 4: Creating comprehensive patient data...');
    let totalPatients = 0;
    let totalSubmissions = 0;
    let casesWith100Clearance = 0;
    let multiDeptPatients = 0;

    // Create 20-25 patients with comprehensive data
    const numPatients = Math.floor(Math.random() * 6) + 20;

    for (let patientIdx = 0; patientIdx < numPatients; patientIdx++) {
      const uhid = generateUHID(totalPatients);
      const patientInfo = PATIENT_DATA[totalPatients % PATIENT_DATA.length];
      const ward = getRandomWard();
      const unitNo = getRandomUnitNo();
      
      let patient = await Patient.findOne({ uhid });
      if (!patient) {
        patient = await Patient.create({
          uhid,
          patientName: patientInfo.name,
          dateOfBirth: new Date(patientInfo.dob),
          gender: patientInfo.gender,
          contactNumber: patientInfo.contact,
          address: patientInfo.address,
          ward,
          unitNo,
        });
        totalPatients++;
      } else {
        // Update existing patient with complete data
        if (!patient.ward || !patient.unitNo || !patient.dateOfBirth) {
          patient.ward = patient.ward || ward;
          patient.unitNo = patient.unitNo || unitNo;
          patient.dateOfBirth = patient.dateOfBirth || new Date(patientInfo.dob);
          patient.gender = patient.gender || patientInfo.gender;
          patient.contactNumber = patient.contactNumber || patientInfo.contact;
          patient.address = patient.address || patientInfo.address;
          await patient.save();
        }
      }

      // Each patient can have procedures in 1-3 different departments
      const numDeptsForPatient = Math.floor(Math.random() * 3) + 1;
      const selectedDepts = [];
      
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

        // All submissions are locked by default (as per controller logic)
        // 30% chance of 100% clearance
        const has100Clearance = Math.random() < 0.30;
        if (has100Clearance) casesWith100Clearance++;

        const submittedAt = getRandomDate();
        const doctorUser = doctorUsers[dept._id.toString()] || adminUser;

        const submissions = [];
        for (const item of checklistItems) {
          const response = getRandomResponse(has100Clearance);
          const isRemarksSection = item.section === 'REMARKS & OBSERVATION';
          let remarks = '';
          
          if (response === 'NO') {
            remarks = generateRemarks(item.section);
          } else if (isRemarksSection && response === 'YES') {
            const observations = [
              'All procedures completed as per protocol',
              'Patient stable throughout procedure',
              'No complications observed',
              'Standard operating procedures followed',
              'All safety measures in place',
              'Patient responded well to treatment',
              'Excellent patient cooperation',
            ];
            remarks = observations[Math.floor(Math.random() * observations.length)];
          }
          
          const responsibility = response === 'NO' ? 'Quality Team' : '';
          const status = has100Clearance && response === 'YES'
            ? (Math.random() < 0.80 ? 'CLOSED' : getRandomStatus())
            : getRandomStatus();

          submissions.push({
            department: dept._id,
            formTemplate: form._id,
            patient: patient._id,
            uhid: patient.uhid,
            patientName: patient.patientName,
            checklistItemId: item._id,
            yesNoNa: response,
            responseValue: response, // Ensure responseValue matches yesNoNa
            remarks: remarks || '',
            responsibility: responsibility || '',
            status: status || 'OPEN',
            submittedBy: doctorUser._id,
            submittedAt,
            isLocked: true, // All submissions are locked by default as per controller
          });
        }

        if (submissions.length > 0) {
          await AuditSubmission.insertMany(submissions);
          totalSubmissions += submissions.length;
        }
      }

      // Create submissions for ANAE and NUS (common checklists)
      for (const { form, department: commonDept } of commonForms) {
        const checklistItems = await ChecklistItem.find({
          formTemplate: form._id,
          isActive: true,
        }).sort({ order: 1 });

        if (checklistItems.length === 0) continue;

        // All submissions are locked by default (as per controller logic)
        const has100Clearance = Math.random() < 0.35;

        const submittedAt = getRandomDate(5);
        const commonUser = commonDept.code === 'ANAE' ? anaeUser : nusUser;

        const submissions = [];
        for (const item of checklistItems) {
          const response = getRandomResponse(has100Clearance);
          let remarks = '';
          
          if (response === 'NO') {
            remarks = generateRemarks(item.section);
          }
          
          const responsibility = response === 'NO' ? (commonDept.code === 'ANAE' ? 'Anesthesia Team' : 'Nursing Team') : '';
          const status = has100Clearance && response === 'YES'
            ? (Math.random() < 0.85 ? 'CLOSED' : getRandomStatus())
            : getRandomStatus();

          submissions.push({
            department: commonDept._id,
            formTemplate: form._id,
            patient: patient._id,
            uhid: patient.uhid,
            patientName: patient.patientName,
            checklistItemId: item._id,
            yesNoNa: response,
            responseValue: response, // Ensure responseValue matches yesNoNa
            remarks: remarks || '',
            responsibility: responsibility || '',
            status: status || 'OPEN',
            submittedBy: commonUser._id,
            submittedAt,
            isLocked: true, // All submissions are locked by default as per controller
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

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPREHENSIVE PERFECT DATA SEEDING COMPLETE');
    console.log('='.repeat(70));
    
    const finalPatientCount = await Patient.countDocuments();
    const finalSubmissionCount = await AuditSubmission.countDocuments();
    const finalFormCount = await FormTemplate.countDocuments();
    const finalItemCount = await ChecklistItem.countDocuments();
    const finalUserCount = await User.countDocuments();
    
    console.log(`\n📋 Forms & Items:`);
    console.log(`   Total Forms: ${finalFormCount}`);
    console.log(`   Total Checklist Items: ${finalItemCount}`);
    
    console.log(`\n👥 Users:`);
    console.log(`   Total Users: ${finalUserCount}`);
    console.log(`   Admin Users: ${await User.countDocuments({ role: 'admin' })}`);
    console.log(`   Department Users: ${await User.countDocuments({ role: 'user' })}`);
    
    console.log(`\n🏥 Patients:`);
    console.log(`   New Patients Created: ${totalPatients}`);
    console.log(`   Total Patients in DB: ${finalPatientCount}`);
    console.log(`   Patients with Complete Data: ${await Patient.countDocuments({ 
      ward: { $exists: true, $ne: null, $ne: '' },
      unitNo: { $exists: true, $ne: null, $ne: '' },
      dateOfBirth: { $exists: true }
    })}`);
    
    console.log(`\n📝 Submissions:`);
    console.log(`   New Submissions Created: ${totalSubmissions}`);
    console.log(`   Total Submissions in DB: ${finalSubmissionCount}`);
    console.log(`   Patients with Multiple Departments: ${multiDeptPatients}`);
    console.log(`   Cases with 100% Clearance: ${casesWith100Clearance}`);
    
    console.log(`\n✅ Data Quality:`);
    console.log(`   - All patients have ward and unit number assigned (required fields)`);
    console.log(`   - All patients have complete demographic data`);
    console.log(`   - Realistic submission dates (last 60 days)`);
    console.log(`   - All submissions are locked (isLocked: true) as per controller logic`);
    console.log(`   - Comprehensive remarks and observations`);
    console.log(`   - Multi-department patient scenarios`);
    console.log(`   - Proper data relationships (department, formTemplate, patient, checklistItem)`);
    console.log(`   - responseValue matches yesNoNa for consistency`);
    
    console.log('\n🎉 Perfect data seeding successful!\n');
    console.log('📌 Login Credentials:');
    console.log('   Admin: admin@hospital.com / Admin@123');
    console.log('   Department Users: {code}@hospital.com / {CODE}@123');
    console.log('   Example: og@hospital.com / OG@123\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    console.error(err.stack);
    process.exit(1);
  }
};

RUN();

