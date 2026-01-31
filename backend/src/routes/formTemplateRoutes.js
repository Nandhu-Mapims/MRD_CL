const express = require('express');
const router = express.Router();
const FormTemplate = require('../models/FormTemplate');
const formTemplateController = require('../controllers/formTemplateController');
const auth = require('../middleware/auth');

// Admin: create form template
router.post('/', auth('admin'), async (req, res) => {
  try {
    const { name, description, departmentIds, isCommon, isActive, sections } = req.body;
    const form = await FormTemplate.create({
      name,
      description,
      departments: departmentIds || [],
      isCommon: !!isCommon,
      sections: sections || [],
      isActive: isActive !== undefined ? isActive : true,
    });
    res.status(201).json(form);
  } catch (err) {
    console.error('createFormTemplate error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: list/update/delete templates
router.get('/', auth(['admin', 'auditor', 'chief']), async (_req, res) => {
  try {
    const forms = await FormTemplate.find().populate('departments');
    res.json(forms);
  } catch (err) {
    console.error('listFormTemplates error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get accessible forms for current user (must be before /:id)
router.get('/accessible/list', auth(['admin', 'auditor', 'chief']), formTemplateController.getAccessibleForms);

// Get single form template by ID
router.get('/:id', auth(['admin', 'auditor', 'chief']), async (req, res) => {
  try {
    const { id } = req.params;
    const form = await FormTemplate.findById(id).populate('departments');
    if (!form) {
      return res.status(404).json({ message: 'Form template not found' });
    }
    res.json(form);
  } catch (err) {
    console.error('getFormTemplate error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, departmentIds, isCommon, isActive, sections } = req.body;
    
    console.log(`[DEBUG] Updating form template ${id} with departmentIds:`, departmentIds);
    
    const updateData = {
      name,
      description,
      departments: departmentIds || [], // Ensure it's an array
      isCommon: isCommon !== undefined ? isCommon : false,
      sections: sections || [],
      isActive: isActive !== undefined ? isActive : true,
    };
    
    console.log(`[DEBUG] Update data:`, JSON.stringify(updateData, null, 2));
    
    const form = await FormTemplate.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('departments');
    
    if (!form) return res.status(404).json({ message: 'Form template not found' });
    
    console.log(`[DEBUG] Updated form template:`, {
      id: form._id,
      name: form.name,
      departments: form.departments?.map(d => ({ id: d._id, name: d.name })) || []
    });
    
    res.json(form);
  } catch (err) {
    console.error('updateFormTemplate error', err);
    console.error('Error details:', {
      message: err.message,
      name: err.name,
      stack: err.stack,
      errors: err.errors,
      requestBody: req.body
    });
    
    const errorResponse = {
      message: 'Server error',
      error: err.message,
    };
    
    // Always include additional details for debugging
    errorResponse.stack = err.stack;
    if (err.errors) {
      errorResponse.validationErrors = err.errors;
    }
    errorResponse.requestBody = req.body;
    
    res.status(500).json(errorResponse);
  }
});

router.delete('/:id', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await FormTemplate.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    console.error('deleteFormTemplate error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign users to a form
router.put('/:id/assign-users', auth('admin'), formTemplateController.assignUsersToForm);

module.exports = router;


