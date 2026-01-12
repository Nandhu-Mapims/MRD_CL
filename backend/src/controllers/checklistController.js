const ChecklistItem = require('../models/ChecklistItem');
const Department = require('../models/Department');

// Admin: create checklist item
exports.createChecklistItem = async (req, res) => {
  try {
    const { label, departmentScope, departmentId, formTemplateId, section, responseType, responseOptions, isActive, order, isMandatory } =
      req.body;

    let department = undefined;
    if (departmentScope === 'SINGLE') {
      if (!departmentId) {
        console.error('Missing departmentId for SINGLE scope:', req.body);
        return res.status(400).json({ message: 'departmentId is required when departmentScope is SINGLE' });
      }
      // Ensure departmentId is converted to ObjectId
      const mongoose = require('mongoose');
      try {
        department = new mongoose.Types.ObjectId(departmentId);
      } catch (err) {
        console.error('Invalid departmentId format:', departmentId, err);
        return res.status(400).json({ message: 'Invalid department ID format' });
      }
      const exists = await Department.findById(department);
      if (!exists) {
        console.error('Department not found:', department, 'from departmentId:', departmentId);
        return res.status(400).json({ message: 'Invalid department' });
      }
    } else if (departmentScope === 'ALL') {
      // For ALL scope, department should be undefined
      department = undefined;
    }

    // Clean up responseOptions - only set if responseType is MULTI_SELECT and options are provided
    // For TEXT and YES_NO types, explicitly set to undefined (not empty string)
    let cleanedResponseOptions = undefined;
    if (responseType === 'MULTI_SELECT' && responseOptions && responseOptions.trim()) {
      cleanedResponseOptions = responseOptions.trim();
    } else if (responseOptions !== undefined && responseOptions !== null) {
      // If responseOptions is provided but not for MULTI_SELECT, set to undefined
      cleanedResponseOptions = undefined;
    }

    // Convert formTemplateId to ObjectId if provided
    let formTemplate = undefined;
    if (formTemplateId) {
      const mongoose = require('mongoose');
      try {
        formTemplate = new mongoose.Types.ObjectId(formTemplateId);
      } catch (err) {
        console.warn('Invalid formTemplateId format:', formTemplateId);
        // Continue without formTemplate if invalid
      }
    }

    // Validate responseType
    const validResponseTypes = ['YES_NO', 'MULTI_SELECT', 'TEXT'];
    const finalResponseType = responseType || 'YES_NO';
    if (!validResponseTypes.includes(finalResponseType)) {
      return res.status(400).json({ 
        message: `Invalid responseType: ${finalResponseType}. Must be one of: ${validResponseTypes.join(', ')}` 
      });
    }

    // Prepare the item data
    const itemData = {
      label,
      departmentScope: departmentScope || 'SINGLE',
      department,
      formTemplate,
      section: section || undefined,
      responseType: finalResponseType,
      responseOptions: cleanedResponseOptions,
      isActive: isActive !== undefined ? isActive : true,
      order: order !== undefined ? order : 0,
      isMandatory: isMandatory !== undefined ? isMandatory : false,
    };
    
    console.log('Creating checklist item with data:', {
      label: itemData.label,
      responseType: itemData.responseType,
      departmentScope: itemData.departmentScope,
      hasDepartment: !!itemData.department,
      hasFormTemplate: !!itemData.formTemplate
    });
    
    const item = await ChecklistItem.create(itemData);
    res.status(201).json(item);
  } catch (err) {
    console.error('createChecklistItem error', err);
    console.error('Error details:', {
      message: err.message,
      name: err.name,
      stack: err.stack,
      errors: err.errors,
      requestBody: req.body
    });
    
    // Return detailed error for debugging (always include details)
    const errorResponse = { 
      message: 'Server error',
      error: err.message,
    };
    
    // Always include additional details for debugging
    errorResponse.stack = err.stack;
    if (err.errors) {
      errorResponse.validationErrors = err.errors;
    }
    errorResponse.requestBody = req.body; // Include request body for debugging
    
    res.status(500).json(errorResponse);
  }
};

// Admin: update checklist item (including assign department, activate/deactivate, reorder)
exports.updateChecklistItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, departmentScope, departmentId, formTemplateId, section, responseType, responseOptions, isActive, order, isMandatory } =
      req.body;

    // Clean up responseOptions - only set if responseType is MULTI_SELECT and options are provided
    // For TEXT and YES_NO types, explicitly set to undefined (not empty string)
    let cleanedResponseOptions = undefined;
    if (responseType === 'MULTI_SELECT' && responseOptions && responseOptions.trim()) {
      cleanedResponseOptions = responseOptions.trim();
    } else if (responseOptions !== undefined && responseOptions !== null) {
      // If responseOptions is provided but not for MULTI_SELECT, set to undefined
      cleanedResponseOptions = undefined;
    }

    // Convert formTemplateId to ObjectId if provided
    let formTemplate = undefined;
    if (formTemplateId) {
      const mongoose = require('mongoose');
      try {
        formTemplate = new mongoose.Types.ObjectId(formTemplateId);
      } catch (err) {
        console.warn('Invalid formTemplateId format:', formTemplateId);
        // Continue without formTemplate if invalid
      }
    }

    // Validate responseType
    const validResponseTypes = ['YES_NO', 'MULTI_SELECT', 'TEXT'];
    const finalResponseType = responseType || 'YES_NO';
    if (!validResponseTypes.includes(finalResponseType)) {
      return res.status(400).json({ 
        message: `Invalid responseType: ${finalResponseType}. Must be one of: ${validResponseTypes.join(', ')}` 
      });
    }

    const update = {
      label,
      departmentScope,
      formTemplate: formTemplate,
      section: section || undefined,
      responseType: finalResponseType,
      responseOptions: cleanedResponseOptions,
      isActive,
      order,
      isMandatory,
    };

    // Handle department assignment
    if (departmentScope === 'SINGLE') {
      if (!departmentId) {
        console.error('Missing departmentId for SINGLE scope in update:', req.body);
        return res.status(400).json({ message: 'departmentId is required when departmentScope is SINGLE' });
      }
      const mongoose = require('mongoose');
      try {
        update.department = new mongoose.Types.ObjectId(departmentId);
        // Verify department exists
        const deptExists = await Department.findById(update.department);
        if (!deptExists) {
          console.error('Department not found for update:', update.department, 'from departmentId:', departmentId);
          return res.status(400).json({ message: 'Invalid department' });
        }
      } catch (err) {
        console.error('Invalid departmentId format for update:', departmentId, err);
        return res.status(400).json({ message: 'Invalid department ID format' });
      }
    } else if (departmentScope === 'ALL') {
      update.department = undefined;
    }

    console.log('Updating checklist item:', {
      id,
      label: update.label,
      responseType: update.responseType,
      departmentScope: update.departmentScope,
      hasDepartment: !!update.department,
      hasFormTemplate: !!update.formTemplate
    });

    const item = await ChecklistItem.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ message: 'Checklist item not found' });
    res.json(item);
  } catch (err) {
    console.error('updateChecklistItem error', err);
    console.error('Error details:', {
      message: err.message,
      name: err.name,
      stack: err.stack,
      errors: err.errors,
      requestBody: req.body
    });
    
    // Return detailed error for debugging (always include details)
    const errorResponse = { 
      message: 'Server error',
      error: err.message,
    };
    
    // Always include additional details for debugging
    errorResponse.stack = err.stack;
    if (err.errors) {
      errorResponse.validationErrors = err.errors;
    }
    errorResponse.requestBody = req.body; // Include request body for debugging
    
    res.status(500).json(errorResponse);
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
    const mongoose = require('mongoose');

    if (!departmentId) {
      return res.status(400).json({ message: 'Department ID is required' });
    }

    // Convert to ObjectId for proper comparison
    let deptObjectId;
    try {
      deptObjectId = new mongoose.Types.ObjectId(departmentId);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid department ID format' });
    }

    // If formTemplateId is provided, get items for that specific form template
    // BUT first verify the form is assigned to this department
    if (formTemplateId) {
      let formTemplateObjectId;
      try {
        formTemplateObjectId = new mongoose.Types.ObjectId(formTemplateId);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid form template ID format' });
      }

      // Verify the form template is assigned to this department or is common (ANAE/NUS only)
      const formTemplate = await FormTemplate.findById(formTemplateObjectId).populate('departments');
      if (!formTemplate) {
        return res.status(404).json({ message: 'Form template not found' });
      }

      // Get ANAE and NUS department IDs - these forms are common for all departments
      const Department = require('../models/Department');
      const anaDept = await Department.findOne({ code: 'ANAE' });
      const nusDept = await Department.findOne({ code: 'NUS' });
      const anaDeptId = anaDept?._id?.toString();
      const nusDeptId = nusDept?._id?.toString();

      // Check if form is assigned to ANAE or NUS - these are common for all departments
      const formDeptIds = (formTemplate.departments || []).map(dept => {
        if (dept._id) return dept._id.toString();
        if (dept.toString) return dept.toString();
        return String(dept);
      });
      
      const isAnaeForm = anaDeptId && formDeptIds.includes(anaDeptId);
      const isNusForm = nusDeptId && formDeptIds.includes(nusDeptId);
      const isCommonForm = isAnaeForm || isNusForm;

      // Check if form is assigned to this department
      // Handle both populated (object with _id) and unpopulated (ObjectId) departments
      let isAssigned = false;
      if (isCommonForm) {
        // ANAE and NUS forms are accessible to all departments
        isAssigned = true;
        console.log(`[DEBUG] Form template ${formTemplateId} is assigned to ANAE/NUS, accessible to all departments`);
      } else if (formTemplate.departments && formTemplate.departments.length > 0) {
        // Convert department IDs to strings for comparison
        const deptIdStr = departmentId.toString();
        const deptObjectIdStr = deptObjectId.toString();
        
        isAssigned = formDeptIds.some(id => id === deptIdStr || id === deptObjectIdStr);
        
        console.log(`[DEBUG] Form template ${formTemplateId} department check:`, {
          formDeptIds,
          requestedDeptId: deptIdStr,
          requestedDeptObjectId: deptObjectIdStr,
          isAssigned
        });
      }

      if (!isAssigned) {
        console.log(`[DEBUG] Form template ${formTemplateId} is not assigned to department ${departmentId}`);
        console.log(`[DEBUG] Form departments:`, formTemplate.departments);
        console.log(`[DEBUG] Form isCommon:`, formTemplate.isCommon);
        return res.json([]); // Return empty array if form not assigned to department
      }

      // Get items for this form template that match the department scope
      // Use ObjectId for proper MongoDB comparison
      // Note: Schema only supports 'SINGLE' and 'ALL' scopes, not 'MULTIPLE'
      const query = {
        isActive: true,
        formTemplate: formTemplateObjectId,
        $or: [
          { departmentScope: 'ALL' },
          { departmentScope: 'SINGLE', department: deptObjectId },
        ],
      };
      
      console.log(`[DEBUG] Query for items:`, JSON.stringify({
        isActive: true,
        formTemplate: formTemplateObjectId.toString(),
        $or: query.$or
      }, null, 2));
      
      let items;
      try {
        items = await ChecklistItem.find(query)
          .sort({ section: 1, order: 1, createdAt: 1 })
          .populate({
            path: 'department',
            select: 'name code',
            strictPopulate: false // Allow null/undefined departments (for ALL scope items)
          })
          .populate({
            path: 'formTemplate',
            select: 'name',
            strictPopulate: false
          });
      } catch (populateErr) {
        console.error('[DEBUG] Error populating items:', populateErr);
        // Try without populate if it fails
        items = await ChecklistItem.find(query)
          .sort({ section: 1, order: 1, createdAt: 1 });
        console.log('[DEBUG] Loaded items without populate due to error');
      }
      
      console.log(`[DEBUG] getChecklistForDepartment with formTemplateId: departmentId=${departmentId}, formTemplateId=${formTemplateId}, items=${items.length}`);
      console.log(`[DEBUG] Items breakdown: ALL scope=${items.filter(i => i.departmentScope === 'ALL').length}, SINGLE scope=${items.filter(i => i.departmentScope === 'SINGLE').length}`);
      
      // Also check if there are any items for this form template at all (for debugging)
      const allItemsForForm = await ChecklistItem.find({
        isActive: true,
        formTemplate: formTemplateObjectId,
      });
      console.log(`[DEBUG] Total items for form template ${formTemplateId} (any department): ${allItemsForForm.length}`);
      if (allItemsForForm.length > 0 && items.length === 0) {
        console.log(`[DEBUG] WARNING: Form has ${allItemsForForm.length} items but none match the department query`);
        console.log(`[DEBUG] Requested department: ${departmentId} (ObjectId: ${deptObjectId})`);
        console.log(`[DEBUG] Sample items:`, allItemsForForm.slice(0, 5).map(i => ({
          _id: i._id,
          label: i.label,
          departmentScope: i.departmentScope,
          department: i.department ? (i.department._id || i.department).toString() : 'null',
          departmentType: typeof i.department,
          section: i.section
        })));
        
        // Try a simpler query to see if we can find items at all
        const simpleQueryItems = await ChecklistItem.find({
          isActive: true,
          formTemplate: formTemplateObjectId,
          departmentScope: 'SINGLE'
        }).limit(5);
        console.log(`[DEBUG] Items with SINGLE scope:`, simpleQueryItems.map(i => ({
          department: i.department ? (i.department._id || i.department).toString() : 'null',
          matches: i.department && (
            i.department.toString() === departmentId || 
            i.department.toString() === deptObjectId.toString() ||
            (i.department._id && i.department._id.toString() === departmentId) ||
            (i.department._id && i.department._id.toString() === deptObjectId.toString())
          )
        })));
      }
      
      return res.json(items);
    }

    // Otherwise, get items assigned to this department OR items from form templates assigned to this department
    // First, get all form templates assigned to this department (explicitly assigned)
    const formTemplates = await FormTemplate.find({
      isActive: true,
      departments: deptObjectId, // Check if departmentId is in departments array
    });

    // Also get common forms (isCommon = true) - these are available to all departments
    const commonForms = await FormTemplate.find({
      isActive: true,
      isCommon: true,
    });

    // Combine both types of form templates
    const allFormTemplates = [...formTemplates, ...commonForms];
    const formTemplateIds = allFormTemplates.map((ft) => ft._id);

    // Get items that are:
    // 1. Directly assigned to this department (SINGLE scope)
    // 2. OR available to all departments (ALL scope)
    // 3. OR belong to a form template assigned to this department
    // 4. OR belong to a common form template (available to all departments)
    let items;
    try {
      items = await ChecklistItem.find({
        isActive: true,
        $or: [
          { departmentScope: 'SINGLE', department: deptObjectId },
          { departmentScope: 'ALL' },
          { formTemplate: { $in: formTemplateIds } },
        ],
      })
        .sort({ section: 1, order: 1, createdAt: 1 })
        .populate({
          path: 'department',
          select: 'name code',
          strictPopulate: false
        })
        .populate({
          path: 'formTemplate',
          select: 'name isCommon',
          strictPopulate: false
        });
    } catch (populateErr) {
      console.error('[DEBUG] Error populating items:', populateErr);
      // Try without populate if it fails
      items = await ChecklistItem.find({
        isActive: true,
        $or: [
          { departmentScope: 'SINGLE', department: deptObjectId },
          { departmentScope: 'ALL' },
          { formTemplate: { $in: formTemplateIds } },
        ],
      })
        .sort({ section: 1, order: 1, createdAt: 1 });
      console.log('[DEBUG] Loaded items without populate due to error');
    }

    console.log(`[DEBUG] getChecklistForDepartment: departmentId=${departmentId}, assignedForms=${formTemplates.length}, commonForms=${commonForms.length}, items=${items.length}`);
    
    res.json(items);
  } catch (err) {
    console.error('[ERROR] getChecklistForDepartment error:', err);
    console.error('[ERROR] Error stack:', err.stack);
    console.error('[ERROR] Error name:', err.name);
    console.error('[ERROR] Error message:', err.message);
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};


