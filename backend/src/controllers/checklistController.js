const ChecklistItem = require('../models/ChecklistItem');
const Department = require('../models/Department');

// Admin: create checklist item
exports.createChecklistItem = async (req, res) => {
  try {
    const { label, departmentScope, departmentId, formTemplateId, section, responseType, responseOptions, isActive, order, isMandatory } =
      req.body;

    let department = undefined;
    if (departmentScope === 'SINGLE') {
      department = departmentId;
      const exists = await Department.findById(department);
      if (!exists) {
        return res.status(400).json({ message: 'Invalid department' });
      }
    }

    const item = await ChecklistItem.create({
      label,
      departmentScope: departmentScope || 'SINGLE',
      department,
      formTemplate: formTemplateId || undefined,
      section: section || undefined,
      responseType: responseType || 'YES_NO_NA',
      responseOptions: responseOptions || undefined,
      isActive,
      order,
      isMandatory,
    });
    res.status(201).json(item);
  } catch (err) {
    console.error('createChecklistItem error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: update checklist item (including assign department, activate/deactivate, reorder)
exports.updateChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, departmentScope, departmentId, formTemplateId, section, responseType, responseOptions, isActive, order, isMandatory } =
      req.body;

    const update = {
      label,
      departmentScope,
      formTemplate: formTemplateId,
      section: section || undefined,
      responseType: responseType || 'YES_NO_NA',
      responseOptions: responseOptions || undefined,
      isActive,
      order,
      isMandatory,
    };

    if (departmentScope === 'SINGLE') {
      update.department = departmentId;
    } else {
      update.department = undefined;
    }

    const item = await ChecklistItem.findByIdAndUpdate(id, update, { new: true });
    if (!item) return res.status(404).json({ message: 'Checklist item not found' });
    res.json(item);
  } catch (err) {
    console.error('updateChecklistItem error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    await ChecklistItem.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    console.error('deleteChecklistItem error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: bulk reorder items for a department or global
exports.reorderChecklistItems = async (req, res) => {
  try {
    const { items } = req.body; // [{id, order}]
    const bulk = items.map((it) => ({
      updateOne: {
        filter: { _id: it.id },
        update: { order: it.order },
      },
    }));
    await ChecklistItem.bulkWrite(bulk);
    res.json({ message: 'Reordered successfully' });
  } catch (err) {
    console.error('reorderChecklistItems error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// User: get checklist by department - only items assigned to this department or its form templates
exports.getChecklistForDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params; // Get from URL params
    const { formTemplateId } = req.query; // Optional form template filter from query
    const FormTemplate = require('../models/FormTemplate');

    if (!departmentId) {
      return res.status(400).json({ message: 'Department ID is required' });
    }

    // If formTemplateId is provided, get items for that specific form template
    if (formTemplateId) {
      const items = await ChecklistItem.find({
        isActive: true,
        formTemplate: formTemplateId,
      })
        .sort({ section: 1, order: 1, createdAt: 1 })
        .populate('department')
        .populate('formTemplate', 'name');
      return res.json(items);
    }

    // Otherwise, get items assigned to this department OR items from form templates assigned to this department
    // First, get all form templates assigned to this department (only explicitly assigned, not common)
    const formTemplates = await FormTemplate.find({
      isActive: true,
      departments: departmentId, // Only forms explicitly assigned to this department
    });

    const formTemplateIds = formTemplates.map((ft) => ft._id);

    // Get items that are:
    // 1. Directly assigned to this department (SINGLE scope)
    // 2. OR belong to a form template assigned to this department
    const items = await ChecklistItem.find({
      isActive: true,
      $or: [
        { departmentScope: 'SINGLE', department: departmentId },
        { formTemplate: { $in: formTemplateIds } },
      ],
    })
      .sort({ section: 1, order: 1, createdAt: 1 })
      .populate('department')
      .populate('formTemplate', 'name');

    console.log(`[DEBUG] getChecklistForDepartment: departmentId=${departmentId}, forms=${formTemplates.length}, items=${items.length}`);
    
    res.json(items);
  } catch (err) {
    console.error('getChecklistForDepartment error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


