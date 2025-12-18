const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Department = require('../models/Department');
const FormTemplate = require('../models/FormTemplate');
const ChecklistItem = require('../models/ChecklistItem');

dotenv.config();

(async () => {
  try {
    await connectDB();

    // Find CS department
    const csDept = await Department.findOne({ code: 'CS' });
    if (!csDept) {
      console.log('❌ CS department not found');
      process.exit(1);
    }

    console.log(`✅ CS Department: ${csDept.name} (${csDept._id})`);

    // Find forms assigned to CS
    const forms = await FormTemplate.find({
      departments: csDept._id,
      isActive: true,
    }).populate('departments');

    console.log(`\n📋 Forms assigned to CS: ${forms.length}`);
    forms.forEach((form) => {
      console.log(`   - ${form.name}`);
      console.log(`     Departments: ${form.departments.map((d) => d.code).join(', ')}`);
    });

    // Find checklist items for these forms
    const formIds = forms.map((f) => f._id);
    const items = await ChecklistItem.find({
      formTemplate: { $in: formIds },
      isActive: true,
    }).populate('formTemplate', 'name');

    console.log(`\n📝 Checklist Items: ${items.length}`);
    if (items.length > 0) {
      const bySection = {};
      items.forEach((item) => {
        const section = item.section || 'Other';
        if (!bySection[section]) bySection[section] = [];
        bySection[section].push(item);
      });

      Object.keys(bySection).forEach((section) => {
        console.log(`\n   ${section}: ${bySection[section].length} items`);
        bySection[section].slice(0, 3).forEach((item) => {
          console.log(`     - ${item.label}`);
        });
        if (bySection[section].length > 3) {
          console.log(`     ... and ${bySection[section].length - 3} more`);
        }
      });
    } else {
      console.log('   ⚠️  No checklist items found!');
      console.log('   This means the form has no items or items are inactive.');
    }

    // Test the query that the API uses
    console.log(`\n🔍 Testing API query for departmentId: ${csDept._id}`);
    const testItems = await ChecklistItem.find({
      isActive: true,
      $or: [
        { departmentScope: 'SINGLE', department: csDept._id },
        { formTemplate: { $in: formIds } },
      ],
    });

    console.log(`   Items returned by API query: ${testItems.length}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();

