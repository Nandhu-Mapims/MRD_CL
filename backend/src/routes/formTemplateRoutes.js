const express = require('express');
const router = express.Router();
const FormTemplate = require('../models/FormTemplate');
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
router.get('/', auth(['admin', 'user']), async (_req, res) => {
  try {
    const forms = await FormTemplate.find().populate('departments');
    res.json(forms);
  } catch (err) {
    console.error('listFormTemplates error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, departmentIds, isCommon, isActive, sections } = req.body;
    const form = await FormTemplate.findByIdAndUpdate(
      id,
      {
        name,
        description,
        departments: departmentIds,
        isCommon,
        sections: sections || [],
        isActive,
      },
      { new: true }
    );
    if (!form) return res.status(404).json({ message: 'Form template not found' });
    res.json(form);
  } catch (err) {
    console.error('updateFormTemplate error', err);
    res.status(500).json({ message: 'Server error' });
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

module.exports = router;


