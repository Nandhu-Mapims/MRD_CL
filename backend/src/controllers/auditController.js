const AuditSubmission = require('../models/AuditSubmission');
const Patient = require('../models/Patient');

// User: submit audit form (multiple checklist items)
exports.submitAudit = async (req, res) => {
  try {
    const { departmentId, formTemplateId, uhid, patientName, items } = req.body;
    // items: [{ checklistItemId, yesNoNa, remarks, responsibility, status }]

    // Validate mandatory fields
    if (!uhid || !uhid.trim()) {
      return res.status(400).json({ message: 'UHID is required' });
    }
    if (!patientName || !patientName.trim()) {
      return res.status(400).json({ message: 'Patient Name is required' });
    }

    const userId = req.user.sub;
    const user = await require('../models/User').findById(userId);

    // Verify user can only submit for their assigned department (unless admin)
    if (user.role === 'user' && user.department && user.department.toString() !== departmentId) {
      return res.status(403).json({ message: 'You can only submit audits for your assigned department' });
    }

    // Normalize UHID (uppercase, trimmed)
    const normalizedUHID = uhid.trim().toUpperCase();
    const normalizedPatientName = patientName.trim();

    // Find or create patient by UHID (UHID is unique)
    let patient = await Patient.findOne({ uhid: normalizedUHID });
    
    if (!patient) {
      // Create new patient
      patient = await Patient.create({
        uhid: normalizedUHID,
        patientName: normalizedPatientName,
      });
    } else {
      // Update patient name if it has changed (in case of corrections)
      if (patient.patientName !== normalizedPatientName) {
        patient.patientName = normalizedPatientName;
        await patient.save();
      }
    }

    // Create audit submissions with patient reference
    const docs = items.map((it) => ({
      department: departmentId,
      formTemplate: formTemplateId || undefined,
      patient: patient._id, // Reference to Patient model
      uhid: normalizedUHID, // Keep for backward compatibility and easy querying
      patientName: normalizedPatientName, // Keep for backward compatibility
      checklistItemId: it.checklistItemId,
      yesNoNa: it.yesNoNa || undefined, // Legacy field
      responseValue: it.responseValue || it.yesNoNa || '', // New flexible field
      remarks: it.remarks,
      responsibility: it.responsibility,
      status: it.status || 'OPEN',
      submittedBy: userId,
      submittedAt: new Date(),
    }));

    const created = await AuditSubmission.insertMany(docs);
    
    // Populate patient data in response
    await AuditSubmission.populate(created, { path: 'patient', select: 'uhid patientName' });
    
    res.status(201).json(created);
  } catch (err) {
    console.error('submitAudit error', err);
    
    // Handle duplicate UHID error (shouldn't happen, but just in case)
    if (err.code === 11000) {
      return res.status(400).json({ message: 'UHID already exists. Please use a unique UHID.' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// User: fetch previous submissions for a department (or all)
exports.getSubmissions = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const filter = {};
    if (departmentId) filter.department = departmentId;

    const submissions = await AuditSubmission.find(filter)
      .populate('department')
      .populate('patient', 'uhid patientName') // Populate patient reference
      .populate('checklistItemId')
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(500);

    res.json(submissions);
  } catch (err) {
    console.error('getSubmissions error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Dashboard: comprehensive stats with case counts
exports.getStats = async (req, res) => {
  try {
    // Department-wise statistics
    const deptStats = await AuditSubmission.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          compliant: {
            $sum: {
              $cond: [{ $eq: ['$yesNoNa', 'YES'] }, 1, 0],
            },
          },
          nonCompliant: {
            $sum: {
              $cond: [{ $eq: ['$yesNoNa', 'NO'] }, 1, 0],
            },
          },
          openIssues: {
            $sum: {
              $cond: [{ $ne: ['$status', 'CLOSED'] }, 1, 0],
            },
          },
          closedIssues: {
            $sum: {
              $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Case counts (unique UHIDs per department)
    const caseCounts = await AuditSubmission.aggregate([
      {
        $group: {
          _id: {
            department: '$department',
            uhid: '$uhid',
          },
        },
      },
      {
        $group: {
          _id: '$_id.department',
          caseCount: { $sum: 1 },
        },
      },
    ]);

    // Combine stats with case counts
    const statsWithCases = deptStats.map((stat) => {
      const caseStat = caseCounts.find((c) => c._id?.toString() === stat._id?.toString());
      return {
        ...stat,
        caseCount: caseStat?.caseCount || 0,
      };
    });

    // Overall statistics
    const overall = await AuditSubmission.aggregate([
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          totalCompliant: {
            $sum: {
              $cond: [{ $eq: ['$yesNoNa', 'YES'] }, 1, 0],
            },
          },
          totalOpenIssues: {
            $sum: {
              $cond: [{ $ne: ['$status', 'CLOSED'] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Unique cases (unique UHIDs across all departments)
    const uniqueCases = await AuditSubmission.distinct('uhid');

    res.json({
      departmentStats: statsWithCases,
      overall: overall[0] || {
        totalSubmissions: 0,
        totalCompliant: 0,
        totalOpenIssues: 0,
      },
      totalCases: uniqueCases.length,
    });
  } catch (err) {
    console.error('getStats error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all submissions by UHID (for patient report)
exports.getSubmissionsByUHID = async (req, res) => {
  try {
    const { uhid } = req.params;
    
    if (!uhid || !uhid.trim()) {
      return res.status(400).json({ message: 'UHID is required' });
    }

    const normalizedUHID = uhid.trim().toUpperCase();

    // Get patient info
    const patient = await Patient.findOne({ uhid: normalizedUHID });
    if (!patient) {
      // Check if there are any patients with similar UHIDs (for typo detection)
      const similarPatients = await Patient.find({
        uhid: { $regex: normalizedUHID.substring(0, Math.max(3, normalizedUHID.length - 2)), $options: 'i' }
      }).limit(5).select('uhid patientName');
      
      let message = `Patient with UHID "${normalizedUHID}" not found. Please verify the UHID and try again.`;
      if (similarPatients.length > 0) {
        message += ` Did you mean: ${similarPatients.map(p => p.uhid).join(', ')}?`;
      } else {
        message += ' Note: Patients are created automatically when you submit an audit. Make sure you have submitted at least one audit with this UHID.';
      }
      
      return res.status(404).json({ message });
    }

    // Get all submissions for this UHID, grouped by department
    const submissions = await AuditSubmission.find({ uhid: normalizedUHID })
      .populate('department', 'name code')
      .populate('formTemplate', 'name')
      .populate('checklistItemId', 'label section responseType order')
      .populate('submittedBy', 'name email')
      .populate('patient', 'uhid patientName')
      .sort({ department: 1, 'checklistItemId.order': 1, submittedAt: -1 });

    // If patient exists but has no submissions, return empty result
    if (!submissions || submissions.length === 0) {
      return res.json({
        patient: {
          uhid: patient.uhid,
          patientName: patient.patientName,
        },
        departments: [],
        totalSubmissions: 0,
        message: 'Patient found but no audit submissions available for this UHID.',
      });
    }

    // Group by department
    const groupedByDept = submissions.reduce((acc, sub) => {
      const deptId = sub.department?._id?.toString() || 'unknown';
      const deptName = sub.department?.name || 'Unknown Department';
      
      if (!acc[deptId]) {
        acc[deptId] = {
          department: {
            _id: sub.department?._id,
            name: deptName,
            code: sub.department?.code || '',
          },
          submissions: [],
        };
      }
      
      acc[deptId].submissions.push(sub);
      return acc;
    }, {});

    // Group submissions by section within each department
    const result = Object.values(groupedByDept).map((deptData) => {
      const sections = deptData.submissions.reduce((acc, sub) => {
        const sectionName = sub.checklistItemId?.section || 'Other';
        if (!acc[sectionName]) {
          acc[sectionName] = [];
        }
        acc[sectionName].push(sub);
        return acc;
      }, {});

      return {
        department: deptData.department,
        sections: Object.keys(sections)
          .sort()
          .map((sectionName) => ({
            sectionName,
            items: sections[sectionName].sort((a, b) => {
              const orderA = a.checklistItemId?.order || 0;
              const orderB = b.checklistItemId?.order || 0;
              return orderA - orderB;
            }),
          })),
      };
    });

    res.json({
      patient: {
        uhid: patient.uhid,
        patientName: patient.patientName,
      },
      departments: result,
      totalSubmissions: submissions.length,
    });
  } catch (err) {
    console.error('getSubmissionsByUHID error', err);
    res.status(500).json({ 
      message: err.message || 'Server error while fetching patient report. Please try again.' 
    });
  }
};

// Admin: Export submissions with filters (department, date range)
exports.exportSubmissions = async (req, res) => {
  try {
    const { departmentId, startDate, endDate, format = 'json' } = req.query;

    // Build filter
    const filter = {};
    if (departmentId) {
      filter.department = departmentId;
    }
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) {
        filter.submittedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.submittedAt.$lte = end;
      }
    }

    // Fetch submissions with all related data
    const submissions = await AuditSubmission.find(filter)
      .populate('department', 'name code')
      .populate('patient', 'uhid patientName') // Populate patient reference
      .populate('formTemplate', 'name')
      .populate('checklistItemId', 'label responseType')
      .populate('submittedBy', 'name email')
      .sort({ submittedAt: -1, department: 1, uhid: 1 });

    // Format data for export
    const exportData = submissions.map((sub) => ({
      'Submission Date': sub.submittedAt.toISOString().split('T')[0],
      'Submission Time': sub.submittedAt.toTimeString().split(' ')[0],
      'Department': sub.department?.name || 'N/A',
      'Department Code': sub.department?.code || 'N/A',
      'Form Template': sub.formTemplate?.name || 'N/A',
      'UHID': sub.uhid,
      'Patient Name': sub.patientName,
      'Checklist Item': sub.checklistItemId?.label || 'N/A',
      'Response Type': sub.checklistItemId?.responseType || 'YES_NO_NA',
      'Response Value': sub.responseValue || sub.yesNoNa || 'N/A',
      'Remarks': sub.remarks || '',
      'Responsibility': sub.responsibility || '',
      'Status': sub.status,
      'Submitted By': sub.submittedBy?.name || 'N/A',
      'Submitted By Email': sub.submittedBy?.email || 'N/A',
    }));

    if (format === 'csv') {
      // Convert to CSV
      if (exportData.length === 0) {
        return res.status(400).json({ message: 'No data to export' });
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(','),
        ...exportData.map((row) =>
          headers.map((header) => {
            const value = row[header] || '';
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit_submissions_${Date.now()}.csv`);
      res.send(csvRows.join('\n'));
    } else {
      // Return JSON
      res.json({
        totalRecords: exportData.length,
        filters: {
          departmentId: departmentId || 'All',
          startDate: startDate || 'All',
          endDate: endDate || 'All',
        },
        data: exportData,
      });
    }
  } catch (err) {
    console.error('exportSubmissions error', err);
    res.status(500).json({ message: 'Server error' });
  }
};


