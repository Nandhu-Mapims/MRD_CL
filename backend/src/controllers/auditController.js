const AuditSubmission = require('../models/AuditSubmission');
const Patient = require('../models/Patient');
const Admission = require('../models/Admission');

// User submit audit
exports.submitAudit = async (req, res) => {
  try {
    const { uhid, patientName, departmentId, formTemplateId, items, ward, unitNo, ipid, admissionDate, unitChief, auditDate: auditDateInput, auditTime: auditTimeInput } = req.body;
    // JWT payload uses 'sub' field for user ID, not '_id'
    const userId = req.user?.sub || req.user?._id;

    if (!uhid || !patientName || !departmentId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!ward || !unitNo) {
      return res.status(400).json({ message: 'Ward and Unit No are required' });
    }

    const normalizedUHID = uhid.trim().toUpperCase();
    const normalizedPatientName = patientName.trim();

    // Find or create patient (UHID is lifetime unique)
    let patient = await Patient.findOne({ uhid: normalizedUHID });
    if (!patient) {
      patient = await Patient.create({
        uhid: normalizedUHID,
        patientName: normalizedPatientName,
      });
    } else {
      // Update patient name if changed
      if (patient.patientName !== normalizedPatientName) {
        patient.patientName = normalizedPatientName;
        await patient.save();
      }
    }

    // Handle admission and IPID - IPID must be provided by user
    if (!ipid) {
      return res.status(400).json({ message: 'IPID is required. Please enter the In-Patient ID.' });
    }

    const normalizedIPID = ipid.trim().toUpperCase();

    // Find existing admission by IPID
    let admission = await Admission.findOne({ ipid: normalizedIPID });

    if (!admission) {
      // Create new admission with user-provided IPID
      // Check if IPID already exists (uniqueness validation)
      const existingIPID = await Admission.findOne({ ipid: normalizedIPID });
      if (existingIPID) {
        return res.status(400).json({ message: 'IPID already exists. Please use a different IPID.' });
      }

      // Create new admission
      admission = await Admission.create({
        ipid: normalizedIPID,
        patient: patient._id,
        uhid: normalizedUHID,
        admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
        ward: ward.trim(),
        unitNo: unitNo.trim(),
        status: 'Admitted',
        department: departmentId,
      });
    } else {
      // Use existing admission
      // Verify UHID matches
      if (admission.uhid !== normalizedUHID) {
        return res.status(400).json({ message: 'IPID belongs to a different patient. Please verify the UHID and IPID.' });
      }
      
      // Update ward/unit if changed
      if (admission.ward !== ward.trim() || admission.unitNo !== unitNo.trim()) {
        admission.ward = ward.trim();
        admission.unitNo = unitNo.trim();
        await admission.save();
      }
    }

    // Audit date and time for uniqueness: Dept+UHID+IPID+Date+Time (one entry per date+time)
    const now = new Date();
    const auditDateStr = auditDateInput && typeof auditDateInput === 'string' ? auditDateInput.trim() : null;
    const auditTimeStr = auditTimeInput && typeof auditTimeInput === 'string' ? auditTimeInput.trim() : null;
    const auditDate = auditDateStr ? new Date(auditDateStr + 'T00:00:00.000Z') : new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const auditTime = auditTimeStr || now.getUTCHours().toString().padStart(2, '0') + ':' + now.getUTCMinutes().toString().padStart(2, '0');

    // Check for duplicate: same UHID, IPID, Department, Date, and Time
    const existingSubmission = await AuditSubmission.findOne({
      uhid: normalizedUHID,
      ipid: normalizedIPID,
      department: departmentId,
      auditDate,
      auditTime,
    });

    if (existingSubmission) {
      return res.status(400).json({
        message: 'Duplicate: A checklist has already been submitted for this UHID, IPID, Department, Date and Time. Use a different date/time for another audit.',
        existingSubmission: {
          submittedAt: existingSubmission.submittedAt,
          submittedBy: existingSubmission.submittedBy,
          auditDate: existingSubmission.auditDate,
          auditTime: existingSubmission.auditTime,
        }
      });
    }

    // YES - no remarks needed; NO - remarks required
    for (const it of items) {
      const val = (it.responseValue || it.yesNoNa || '').toString().toUpperCase();
      if (val === 'NO' && (!it.remarks || !String(it.remarks).trim())) {
        return res.status(400).json({
          message: 'Remarks are required when "NO" is selected. Please add remarks for all NO responses.',
        });
      }
    }

    // Create audit submissions with patient and admission reference - all locked by default
    const docs = items.map((it) => ({
      department: departmentId,
      formTemplate: formTemplateId || undefined,
      patient: patient._id,
      admission: admission._id,
      uhid: normalizedUHID,
      ipid: normalizedIPID,
      patientName: normalizedPatientName,
      unitChief: unitChief?.trim() || undefined,
      checklistItemId: it.checklistItemId,
      yesNoNa: it.yesNoNa || undefined,
      responseValue: it.responseValue || it.yesNoNa || '',
      remarks: it.remarks || '',
      responsibility: it.responsibility || '',
      submittedBy: userId,
      submittedAt: now,
      auditDate,
      auditTime,
      isLocked: true,
    }));

    const created = await AuditSubmission.insertMany(docs);
    await AuditSubmission.populate(created, [
      { path: 'patient', select: 'uhid patientName' },
      { path: 'admission', select: 'ipid admissionDate dischargeDate status' }
    ]);
    
    res.status(201).json(created);
  } catch (err) {
    console.error('submitAudit error', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'UHID already exists. Please use a unique UHID.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// User: fetch previous submissions for a department (or all)
exports.getSubmissions = async (req, res) => {
  try {
    const { departmentId, uhid, limit = 500 } = req.query;
    const filter = {};
    if (departmentId) filter.department = departmentId;
    if (uhid) filter.uhid = uhid.trim().toUpperCase();

    const submissions = await AuditSubmission.find(filter)
      .populate('department', 'name code')
      .populate('patient', 'uhid patientName ward unitNo')
      .populate('checklistItemId', 'label section responseType')
      .populate('submittedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(submissions);
  } catch (err) {
    console.error('getSubmissions error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Dashboard: comprehensive stats with case counts
exports.getStats = async (req, res) => {
  try {
    // Check if clearance stats are requested (optional, as they're expensive)
    const includeClearance = req.query.includeClearance === 'true';

    // Parallel execution of basic stats queries
    const [deptStats, caseCounts, overall, uniqueCases] = await Promise.all([
      // Department stats aggregation
      AuditSubmission.aggregate([
        {
          $group: {
            _id: '$department',
            total: { $sum: 1 },
            compliant: {
              $sum: {
                $cond: [
                  { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                  1,
                  0
                ]
              }
            },
            nonCompliant: {
              $sum: {
                $cond: [
                  { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['NO']] },
                  1,
                  0
                ]
              }
            },
          },
        },
      ]),
      // Case counts aggregation
      AuditSubmission.aggregate([
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
      ]),
      // Overall stats aggregation
      AuditSubmission.aggregate([
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            totalCompliant: {
              $sum: {
                $cond: [
                  { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                  1,
                  0
                ]
              }
            },
          },
        },
      ]),
      // Unique cases
      AuditSubmission.distinct('uhid'),
    ]);

    // Merge department stats with case counts
    const statsWithCases = deptStats.map((stat) => {
      const caseStat = caseCounts.find((c) => c._id?.toString() === stat._id?.toString());
      return {
        ...stat,
        caseCount: caseStat?.caseCount || 0,
      };
    });

    // Build response with basic stats
    const response = {
      departmentStats: statsWithCases,
      overall: overall[0] || {
        totalSubmissions: 0,
        totalCompliant: 0,
      },
      totalCases: uniqueCases.length,
      clearanceStats: {
        byDepartment: [],
        byForm: [],
      },
    };

    // Only calculate clearance stats if explicitly requested (expensive operation)
    if (includeClearance) {
      try {
        const ChecklistItem = require('../models/ChecklistItem');
        const FormTemplate = require('../models/FormTemplate');
        const allForms = await FormTemplate.find({ isActive: true }).populate('departments').lean();
        
        // Get form item counts in one query
        const formItemCounts = await ChecklistItem.aggregate([
          { $match: { isActive: true } },
          { $group: { _id: '$formTemplate', count: { $sum: 1 } } }
        ]);
        const formItemCountMap = {};
        formItemCounts.forEach(item => {
          formItemCountMap[item._id?.toString()] = item.count;
        });

        // Optimized clearance stats using aggregation
        const clearanceStats = [];
        const deptClearanceStats = {};

        // Process only departments that have stats
        for (const dept of statsWithCases) {
          const deptId = dept._id;
          const assignedForms = allForms.filter(form => 
            form.departments.some(d => d._id?.toString() === deptId?.toString()) || form.isCommon
          );

          for (const form of assignedForms) {
            const itemCount = formItemCountMap[form._id?.toString()];
            if (!itemCount || itemCount === 0) continue;

            // Use aggregation to calculate clearance in one query
            const clearanceData = await AuditSubmission.aggregate([
              {
                $match: {
                  department: deptId,
                  formTemplate: form._id,
                }
              },
              {
                $group: {
                  _id: '$uhid',
                  submissions: {
                    $push: {
                      responseValue: { $ifNull: ['$responseValue', '$yesNoNa'] },
                      submittedAt: '$submittedAt'
                    }
                  }
                }
              },
              {
                $project: {
                  uhid: '$_id',
                  latestSubmissions: {
                    $slice: [
                      {
                        $sortArray: {
                          input: '$submissions',
                          sortBy: { submittedAt: -1 }
                        }
                      },
                      itemCount
                    ]
                  }
                }
              },
              {
                $project: {
                  uhid: 1,
                  isFullyCleared: {
                    $cond: {
                      if: { $eq: [{ $size: '$latestSubmissions' }, itemCount] },
                      then: {
                        $allElementsTrue: {
                          $map: {
                            input: '$latestSubmissions',
                            as: 'sub',
                            in: {
                              $eq: [
                                { $toUpper: { $ifNull: ['$$sub.responseValue', ''] } },
                                'YES'
                              ]
                            }
                          }
                        }
                      },
                      else: false
                    }
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  totalCases: { $sum: 1 },
                  fullyClearedCases: {
                    $sum: { $cond: ['$isFullyCleared', 1, 0] }
                  }
                }
              }
            ]);

            const result = clearanceData[0];
            if (result && result.totalCases > 0) {
              const clearanceRate = Math.round((result.fullyClearedCases / result.totalCases) * 100);
              
              clearanceStats.push({
                departmentId: deptId,
                formId: form._id,
                formName: form.name,
                totalCases: result.totalCases,
                fullyClearedCases: result.fullyClearedCases,
                clearanceRate,
              });

              // Aggregate by department
              const deptIdStr = deptId?.toString();
              if (!deptClearanceStats[deptIdStr]) {
                deptClearanceStats[deptIdStr] = {
                  departmentId: deptIdStr,
                  totalCases: 0,
                  fullyClearedCases: 0,
                };
              }
              deptClearanceStats[deptIdStr].totalCases += result.totalCases;
              deptClearanceStats[deptIdStr].fullyClearedCases += result.fullyClearedCases;
            }
          }
        }

        // Calculate clearance rates for departments
        Object.keys(deptClearanceStats).forEach(deptId => {
          const stat = deptClearanceStats[deptId];
          stat.clearanceRate = stat.totalCases > 0
            ? Math.round((stat.fullyClearedCases / stat.totalCases) * 100)
            : 0;
        });

        response.clearanceStats = {
          byDepartment: Object.values(deptClearanceStats),
          byForm: clearanceStats,
        };
      } catch (clearanceErr) {
        console.error('Error calculating clearance stats:', clearanceErr);
        // Continue without clearance stats if calculation fails
      }
    }

    res.json(response);
  } catch (err) {
    console.error('getStats error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
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
    let submissions = await AuditSubmission.find({ uhid: normalizedUHID })
      .populate('department', 'name code')
      .populate('formTemplate', 'name')
      .populate('checklistItemId', 'label section responseType')
      .populate('submittedBy', 'name email')
      .populate('patient', 'uhid patientName ward unitNo')
      .populate('admission', 'ipid admissionDate dischargeDate status ward unitNo')
      .sort({ submittedAt: -1 });

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No submissions found for this UHID' });
    }

    // Filter out submissions with invalid/null checklistItemId (items that were deleted)
    submissions = submissions.filter(sub => sub.checklistItemId && sub.checklistItemId.label);

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No valid submissions found for this UHID (checklist items may have been deleted)' });
    }

    // Group by date + time + IPID (one audit session per date+time+IPID)
    const groupKey = (sub) => {
      const d = sub.auditDate ? new Date(sub.auditDate) : new Date(sub.submittedAt);
      const dateStr = d.toISOString().slice(0, 10);
      const timeStr = sub.auditTime || (sub.submittedAt ? new Date(sub.submittedAt).toISOString().slice(11, 16) : '00:00');
      return `${dateStr}|${timeStr}|${sub.ipid || ''}`;
    };
    const grouped = {};
    submissions.forEach((sub) => {
      const key = groupKey(sub);
      const d = sub.auditDate ? new Date(sub.auditDate) : new Date(sub.submittedAt);
      const timeStr = sub.auditTime || (sub.submittedAt ? new Date(sub.submittedAt).toISOString().slice(11, 16) : '00:00');
      if (!grouped[key]) grouped[key] = { date: sub.auditDate || sub.submittedAt, auditTime: timeStr, ipid: sub.ipid, submissions: [] };
      grouped[key].submissions.push(sub);
    });
    const groupedByDateAndIPID = Object.values(grouped).map((g) => ({
      date: g.date,
      auditTime: g.auditTime,
      ipid: g.ipid,
      submissions: g.submissions,
    })).sort((a, b) => {
      const da = new Date(a.date);
      const db = new Date(b.date);
      if (da.getTime() !== db.getTime()) return db.getTime() - da.getTime();
      return (b.auditTime || '').localeCompare(a.auditTime || '');
    });

    res.json({ submissions, groupedByDateAndIPID });
  } catch (err) {
    console.error('getSubmissionsByUHID error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all submissions by IPID (for specific admission)
exports.getSubmissionsByIPID = async (req, res) => {
  try {
    const { ipid } = req.params;
    if (!ipid || !ipid.trim()) {
      return res.status(400).json({ message: 'IPID is required' });
    }

    const normalizedIPID = ipid.trim().toUpperCase();
    let submissions = await AuditSubmission.find({ ipid: normalizedIPID })
      .populate('department', 'name code')
      .populate('formTemplate', 'name')
      .populate('checklistItemId', 'label section responseType')
      .populate('submittedBy', 'name email')
      .populate('patient', 'uhid patientName ward unitNo')
      .populate('admission', 'ipid admissionDate dischargeDate status ward unitNo')
      .sort({ submittedAt: -1 });

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No submissions found for this IPID' });
    }

    // Filter out submissions with invalid/null checklistItemId (items that were deleted)
    submissions = submissions.filter(sub => sub.checklistItemId && sub.checklistItemId.label);

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No valid submissions found for this IPID (checklist items may have been deleted)' });
    }

    res.json(submissions);
  } catch (err) {
    console.error('getSubmissionsByIPID error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if submission exists for UHID, IPID, Department, Date, and Time
exports.checkDuplicateSubmission = async (req, res) => {
  try {
    const { uhid, ipid, departmentId, auditDate: auditDateQuery, auditTime: auditTimeQuery } = req.query;

    if (!uhid || !ipid || !departmentId) {
      return res.status(400).json({ message: 'UHID, IPID, and Department ID are required' });
    }

    const normalizedUHID = uhid.trim().toUpperCase();
    const normalizedIPID = ipid.trim().toUpperCase();

    const query = {
      uhid: normalizedUHID,
      ipid: normalizedIPID,
      department: departmentId,
    };

    if (auditDateQuery && auditTimeQuery) {
      const auditDate = new Date(auditDateQuery.trim() + 'T00:00:00.000Z');
      query.auditDate = auditDate;
      query.auditTime = auditTimeQuery.trim();
    }
    // If no auditDate/auditTime, check for any submission (backward compat: old submissions without auditDate/auditTime)
    else {
      const anyExisting = await AuditSubmission.findOne({
        uhid: normalizedUHID,
        ipid: normalizedIPID,
        department: departmentId,
      })
        .populate('submittedBy', 'name email')
        .select('submittedAt submittedBy auditDate auditTime');

      if (anyExisting) {
        return res.json({
          exists: true,
          message: 'A checklist has already been submitted for this UHID, IPID, and Department. Use a different date/time for another audit.',
          submittedAt: anyExisting.submittedAt,
          submittedBy: anyExisting.submittedBy,
          auditDate: anyExisting.auditDate,
          auditTime: anyExisting.auditTime,
        });
      }
      return res.json({ exists: false });
    }

    const existingSubmission = await AuditSubmission.findOne(query)
      .populate('submittedBy', 'name email')
      .select('submittedAt submittedBy auditDate auditTime');

    if (existingSubmission) {
      return res.json({
        exists: true,
        message: 'A checklist has already been submitted for this UHID, IPID, Department, Date and Time.',
        submittedAt: existingSubmission.submittedAt,
        submittedBy: existingSubmission.submittedBy,
        auditDate: existingSubmission.auditDate,
        auditTime: existingSubmission.auditTime,
      });
    }

    return res.json({ exists: false });
  } catch (err) {
    console.error('checkDuplicateSubmission error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all department checklists for a patient (multi-department view)
// Authentication is optional - works for both authenticated and unauthenticated requests
exports.getPatientChecklists = async (req, res) => {
  try {
    const { uhid } = req.query;
    // JWT payload uses 'sub' field for user ID, not '_id'
    const userId = req.user?.sub || req.user?._id;
    const User = require('../models/User');
    const Department = require('../models/Department');
    const FormTemplate = require('../models/FormTemplate');
    const ChecklistItem = require('../models/ChecklistItem');

    if (!uhid || !uhid.trim()) {
      return res.status(400).json({ message: 'UHID is required' });
    }

    const normalizedUHID = uhid.trim().toUpperCase();

    // Get user's department (optional - only if authenticated)
    let user = null;
    let userDeptId = null;
    if (userId) {
      user = await User.findById(userId).populate('department');
      userDeptId = user?.department?._id?.toString();
    }

    // Get or create patient
    let patient = await Patient.findOne({ uhid: normalizedUHID });
    if (!patient) {
      patient = await Patient.create({
        uhid: normalizedUHID,
        patientName: 'Unknown',
        ward: '',
        unitNo: '',
      });
    }

    // Get all departments
    const departments = await Department.find({ isActive: true });
    const allForms = await FormTemplate.find({ isActive: true }).populate('departments');

    const departmentChecklists = [];

    for (const dept of departments) {
      const assignedForms = allForms.filter(form =>
        form.departments.some(d => d._id?.toString() === dept._id?.toString()) || form.isCommon
      );

      for (const form of assignedForms) {
        const checklistItems = await ChecklistItem.find({
          formTemplate: form._id,
          isActive: true,
        }).sort({ order: 1, section: 1 });

        if (checklistItems.length === 0) continue;

        // Get existing submissions for this department/form/patient
        const existingSubmissions = await AuditSubmission.find({
          uhid: normalizedUHID,
          department: dept._id,
          formTemplate: form._id,
        })
          .populate('submittedBy', 'name email')
          .sort({ submittedAt: -1 })
          .limit(checklistItems.length * 2)
          .lean();

        // Get latest submission for each item
        const latestSubmissions = {};
        existingSubmissions.forEach(sub => {
          const itemId = sub.checklistItemId?.toString();
          if (itemId && (!latestSubmissions[itemId] || 
            new Date(sub.submittedAt) > new Date(latestSubmissions[itemId].submittedAt))) {
            latestSubmissions[itemId] = sub;
          }
        });

        // Determine edit permissions (only if user is authenticated)
        const isLocked = existingSubmissions.length > 0 && existingSubmissions[0].isLocked;
        const isUserDept = userDeptId && userDeptId === dept._id?.toString();
        const isCommon = form.isCommon;
        // For unauthenticated users, canEdit is always false (read-only)
        const canEdit = user ? (!isLocked && (isUserDept || isCommon || user.role === 'admin')) : false;

        const itemsWithData = checklistItems.map(item => {
          const submission = latestSubmissions[item._id.toString()];
          return {
            item: {
              _id: item._id,
              label: item.label,
              section: item.section,
              order: item.order,
              isMandatory: item.isMandatory,
            },
            submission: submission ? {
              _id: submission._id,
              yesNoNa: submission.yesNoNa,
              responseValue: submission.responseValue || submission.yesNoNa,
              remarks: submission.remarks,
              responsibility: submission.responsibility,
              submittedAt: submission.submittedAt,
              isLocked: submission.isLocked,
            } : null,
          };
        });

        const latestSubmission = existingSubmissions.length > 0 ? existingSubmissions[0] : null;
        const submittedBy = latestSubmission?.submittedBy
          ? {
              _id: latestSubmission.submittedBy._id,
              name: latestSubmission.submittedBy.name,
              email: latestSubmission.submittedBy.email,
            }
          : null;

        // Only include checklists that have at least some submissions
        if (existingSubmissions.length > 0 || itemsWithData.some(item => item.submission)) {
          departmentChecklists.push({
            department: {
              _id: dept._id,
              name: dept.name,
              code: dept.code,
            },
            form: {
              _id: form._id,
              name: form.name,
            },
            items: itemsWithData,
            canEdit,
            isLocked,
            hasSubmissions: existingSubmissions.length > 0,
            submittedAt: existingSubmissions.length > 0 ? existingSubmissions[0].submittedAt : null,
            submittedBy,
          });
        }
      }
    }

    res.json({
      patient: {
        uhid: patient.uhid,
        patientName: patient.patientName,
        ward: patient.ward || '',
        unitNo: patient.unitNo || '',
      },
      userDepartment: user?.department || null,
      checklists: departmentChecklists,
    });
  } catch (err) {
    console.error('getPatientChecklists error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Export submissions (admin-only)
exports.exportSubmissions = async (req, res) => {
  try {
    const { departmentId, startDate, endDate, format } = req.query;
    const filter = {};
    if (departmentId) filter.department = departmentId;
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) filter.submittedAt.$gte = new Date(startDate);
      if (endDate) filter.submittedAt.$lte = new Date(endDate);
    }

    const submissions = await AuditSubmission.find(filter)
      .populate('department', 'name code')
      .populate('formTemplate', 'name')
      .populate('checklistItemId', 'label section')
      .populate('submittedBy', 'name email')
      .populate('patient', 'uhid patientName ward unitNo')
      .sort({ submittedAt: -1 })
      .limit(10000);

    // Format data for export
    const formattedData = submissions.map(sub => {
      const submittedDate = sub.submittedAt ? new Date(sub.submittedAt) : new Date();
      return {
        'Submission Date': submittedDate.toLocaleDateString('en-GB'),
        'Submission Time': submittedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        'Department': sub.department?.name || sub.department?.code || 'Unknown',
        'Department Code': sub.department?.code || '',
        'UHID': sub.uhid || sub.patient?.uhid || '',
        'Patient Name': sub.patientName || sub.patient?.patientName || 'Unknown',
        'Ward': sub.patient?.ward || '',
        'Unit No': sub.patient?.unitNo || '',
        'Form Template': sub.formTemplate?.name || '',
        'Checklist Item': sub.checklistItemId?.label || '',
        'Section': sub.checklistItemId?.section || '',
        'Response Value': sub.responseValue || sub.yesNoNa || '',
        'Remarks': sub.remarks || '',
        'Responsibility': sub.responsibility || '',
        'Submitted By': sub.submittedBy?.name || sub.submittedBy?.email || 'Unknown',
        'Submitted By Email': sub.submittedBy?.email || '',
        'Is Locked': sub.isLocked ? 'Yes' : 'No',
      };
    });

    // Handle CSV format
    if (format === 'csv') {
      if (formattedData.length === 0) {
        return res.status(404).json({ message: 'No data to export' });
      }

      // Create CSV header
      const headers = Object.keys(formattedData[0]);
      const csvRows = [
        headers.join(','),
        ...formattedData.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            // Escape commas and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ];

      const csvContent = csvRows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit_submissions_${Date.now()}.csv"`);
      return res.send(csvContent);
    }

    // Return JSON format for PDF/preview
    res.json({
      totalRecords: formattedData.length,
      data: formattedData,
    });
  } catch (err) {
    console.error('exportSubmissions error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Executive Analytics: Strategic insights for Managing Director
exports.getExecutiveAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query // 'week', 'month', 'quarter', 'year'
    
    // Calculate date ranges
    const now = new Date()
    const currentPeriod = new Date(now)
    const previousPeriod = new Date(now)
    
    switch (period) {
      case 'week':
        currentPeriod.setDate(now.getDate() - 7)
        previousPeriod.setDate(now.getDate() - 14)
        break
      case 'month':
        currentPeriod.setMonth(now.getMonth() - 1)
        previousPeriod.setMonth(now.getMonth() - 2)
        break
      case 'quarter':
        currentPeriod.setMonth(now.getMonth() - 3)
        previousPeriod.setMonth(now.getMonth() - 6)
        break
      case 'year':
        currentPeriod.setFullYear(now.getFullYear() - 1)
        previousPeriod.setFullYear(now.getFullYear() - 2)
        break
    }

    // Current period stats
    const currentStats = await AuditSubmission.aggregate([
      {
        $match: {
          submittedAt: { $gte: currentPeriod }
        }
      },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          compliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                1,
                0
              ]
            }
          },
          nonCompliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['NO']] },
                1,
                0
              ]
            }
          },
        }
      }
    ])

    // Previous period stats
    const previousStats = await AuditSubmission.aggregate([
      {
        $match: {
          submittedAt: { $gte: previousPeriod, $lt: currentPeriod }
        }
      },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          compliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                1,
                0
              ]
            }
          },
        }
      }
    ])

    const current = currentStats[0] || {
      totalSubmissions: 0,
      compliant: 0,
      nonCompliant: 0,
    }

    const previous = previousStats[0] || {
      totalSubmissions: 0,
      compliant: 0,
    }

    // Calculate trends
    const complianceRate = current.totalSubmissions > 0
      ? Math.round((current.compliant / current.totalSubmissions) * 100)
      : 0

    const previousComplianceRate = previous.totalSubmissions > 0
      ? Math.round((previous.compliant / previous.totalSubmissions) * 100)
      : 0

    const complianceTrend = complianceRate - previousComplianceRate
    const submissionTrend = previous.totalSubmissions > 0
      ? Math.round(((current.totalSubmissions - previous.totalSubmissions) / previous.totalSubmissions) * 100)
      : 0

    // Monthly trends (last 6 months) - single optimized aggregation
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    
    const monthlyTrendsData = await AuditSubmission.aggregate([
      {
        $match: {
          submittedAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' }
          },
          total: { $sum: 1 },
          compliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                1,
                0
              ]
            }
          },
          cases: { $addToSet: '$uhid' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ])

    const monthlyTrends = monthlyTrendsData.map(item => ({
      month: new Date(item._id.year, item._id.month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      submissions: item.total,
      complianceRate: item.total > 0 ? Math.round((item.compliant / item.total) * 100) : 0,
      cases: item.cases.length,
    }))

    // Department performance ranking
    const deptPerformance = await AuditSubmission.aggregate([
      {
        $match: {
          submittedAt: { $gte: currentPeriod }
        }
      },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          compliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                1,
                0
              ]
            }
          },
          cases: { $addToSet: '$uhid' }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'deptInfo'
        }
      },
      {
        $unwind: { path: '$deptInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          departmentId: '$_id',
          departmentName: '$deptInfo.name',
          departmentCode: '$deptInfo.code',
          total: 1,
          compliant: 1,
          cases: { $size: '$cases' },
          complianceRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$compliant', '$total'] }, 100] }] },
              0
            ]
          }
        }
      },
      {
        $sort: { complianceRate: -1 }
      }
    ])

    // Risk indicators
    const highRiskDepts = deptPerformance.filter(d => 
      d.complianceRate < 70
    )

    // 100% Clearance analysis - optimized with aggregation
    const ChecklistItem = require('../models/ChecklistItem')
    const FormTemplate = require('../models/FormTemplate')
    
    const allForms = await FormTemplate.find({ isActive: true }).lean().populate('departments')
    const clearanceAnalysis = []

    // Process only top 5 departments for faster response
    const topDepts = deptPerformance.slice(0, 5)
    
    for (const dept of topDepts) {
      // Use aggregation for faster clearance calculation
      const clearanceData = await AuditSubmission.aggregate([
        {
          $match: {
            department: dept.departmentId,
            submittedAt: { $gte: currentPeriod }
          }
        },
        {
          $group: {
            _id: '$uhid',
            submissions: { $push: '$$ROOT' }
          }
        },
        {
          $project: {
            uhid: '$_id',
            allYes: {
              $cond: {
                if: {
                  $allElementsTrue: {
                    $map: {
                      input: '$submissions',
                      as: 'sub',
                      in: {
                        $or: [
                          { $eq: [{ $toUpper: { $ifNull: ['$$sub.responseValue', '$$sub.yesNoNa'] } }, 'YES'] },
                          { $eq: [{ $toUpper: { $ifNull: ['$$sub.responseValue', '$$sub.yesNoNa'] } }, 'NA'] }
                        ]
                      }
                    }
                  }
                },
                then: true,
                else: false
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalCases: { $sum: 1 },
            fullyCleared: {
              $sum: {
                $cond: ['$allYes', 1, 0]
              }
            }
          }
        }
      ])

      const result = clearanceData[0] || { totalCases: 0, fullyCleared: 0 }
      
      clearanceAnalysis.push({
        departmentId: dept.departmentId,
        departmentName: dept.departmentName,
        departmentCode: dept.departmentCode,
        totalCases: result.totalCases,
        fullyClearedCases: result.fullyCleared,
        clearanceRate: result.totalCases > 0
          ? Math.round((result.fullyCleared / result.totalCases) * 100)
          : 0
      })
    }

    // Overall insights
    const insights = []
    
    if (complianceTrend > 0) {
      insights.push({
        type: 'positive',
        message: `Compliance rate improved by ${complianceTrend}% compared to previous period`
      })
    } else if (complianceTrend < 0) {
      insights.push({
        type: 'warning',
        message: `Compliance rate decreased by ${Math.abs(complianceTrend)}% - requires attention`
      })
    }

    if (highRiskDepts.length > 0) {
      insights.push({
        type: 'critical',
        message: `${highRiskDepts.length} department(s) identified with compliance below 70% or high open issues`
      })
    }

    const topPerformer = deptPerformance[0]
    if (topPerformer) {
      insights.push({
        type: 'positive',
        message: `${topPerformer.departmentName || topPerformer.departmentCode} leading with ${topPerformer.complianceRate}% compliance rate`
      })
    }

    // Get total cases for current period
    const totalCases = (await AuditSubmission.distinct('uhid', {
      submittedAt: { $gte: currentPeriod }
    })).length

    res.json({
      period,
      currentPeriod: {
        start: currentPeriod,
        end: now
      },
      summary: {
        complianceRate,
        previousComplianceRate,
        complianceTrend,
        totalSubmissions: current.totalSubmissions,
        submissionTrend,
        totalCases,
        riskLevel: complianceRate >= 90 ? 'low' : complianceRate >= 70 ? 'medium' : 'high'
      },
      trends: {
        monthly: monthlyTrends
      },
      departmentPerformance: deptPerformance,
      clearanceAnalysis,
      riskIndicators: {
        highRiskDepartments: highRiskDepts.map(d => ({
          name: d.departmentName || d.departmentCode,
          complianceRate: d.complianceRate,
          totalCases: d.cases
        })),
        overallRiskLevel: complianceRate >= 90 ? 'Low Risk' : complianceRate >= 70 ? 'Medium Risk' : 'High Risk'
      },
      insights
    })
  } catch (err) {
    console.error('getExecutiveAnalytics error', err)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// Comprehensive Analytics: Time-series data with date range filtering
exports.getTimeSeriesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query; // groupBy: 'day', 'week', 'month'
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.submittedAt = {};
      if (startDate) dateFilter.submittedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.submittedAt.$lte = new Date(endDate);
    }

    // Determine grouping format based on groupBy parameter
    let dateGroupFormat = {};
    switch (groupBy) {
      case 'day':
        dateGroupFormat = {
          year: { $year: '$submittedAt' },
          month: { $month: '$submittedAt' },
          day: { $dayOfMonth: '$submittedAt' }
        };
        break;
      case 'week':
        dateGroupFormat = {
          year: { $year: '$submittedAt' },
          week: { $week: '$submittedAt' }
        };
        break;
      case 'month':
        dateGroupFormat = {
          year: { $year: '$submittedAt' },
          month: { $month: '$submittedAt' }
        };
        break;
      default:
        dateGroupFormat = {
          year: { $year: '$submittedAt' },
          month: { $month: '$submittedAt' },
          day: { $dayOfMonth: '$submittedAt' }
        };
    }

    const timeSeriesData = await AuditSubmission.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: dateGroupFormat,
          totalSubmissions: { $sum: 1 },
          compliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                1,
                0
              ]
            }
          },
          nonCompliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['NO']] },
                1,
                0
              ]
            }
          },
          uniqueCases: { $addToSet: '$uhid' },
          uniqueAdmissions: { $addToSet: '$ipid' },
          uniqueDepartments: { $addToSet: '$department' },
          uniqueUsers: { $addToSet: '$submittedBy' }
        }
      },
      {
        $project: {
          _id: 1,
          totalSubmissions: 1,
          compliant: 1,
          nonCompliant: 1,
          uniqueCases: { $size: '$uniqueCases' },
          uniqueAdmissions: { $size: '$uniqueAdmissions' },
          uniqueDepartments: { $size: '$uniqueDepartments' },
          uniqueUsers: { $size: '$uniqueUsers' },
          complianceRate: {
            $cond: [
              { $gt: ['$totalSubmissions', 0] },
              { $round: [{ $multiply: [{ $divide: ['$compliant', '$totalSubmissions'] }, 100] }] },
              0
            ]
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
    ]);

    // Format dates for frontend
    const formattedData = timeSeriesData.map(item => {
      let dateLabel = '';
      if (groupBy === 'day') {
        dateLabel = new Date(item._id.year, item._id.month - 1, item._id.day).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric' 
        });
      } else if (groupBy === 'week') {
        dateLabel = `Week ${item._id.week}, ${item._id.year}`;
      } else {
        dateLabel = new Date(item._id.year, item._id.month - 1, 1).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        });
      }

      return {
        date: dateLabel,
        timestamp: new Date(item._id.year, item._id.month - 1, item._id.day || 1),
        ...item
      };
    });

    res.json({
      groupBy,
      dateRange: {
        start: startDate ? new Date(startDate) : null,
        end: endDate ? new Date(endDate) : null
      },
      data: formattedData,
      summary: {
        totalDataPoints: formattedData.length,
        totalSubmissions: formattedData.reduce((sum, d) => sum + d.totalSubmissions, 0),
        totalCases: formattedData.reduce((sum, d) => sum + d.uniqueCases, 0),
        averageComplianceRate: formattedData.length > 0
          ? Math.round(formattedData.reduce((sum, d) => sum + d.complianceRate, 0) / formattedData.length)
          : 0
      }
    });
  } catch (err) {
    console.error('getTimeSeriesAnalytics error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// User Activity Analytics
exports.getUserActivityAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    const User = require('../models/User');
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.submittedAt = {};
      if (startDate) dateFilter.submittedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.submittedAt.$lte = new Date(endDate);
    }
    
    if (departmentId) {
      dateFilter.department = departmentId;
    }

    const userActivity = await AuditSubmission.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$submittedBy',
          totalSubmissions: { $sum: 1 },
          compliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                1,
                0
              ]
            }
          },
          nonCompliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['NO']] },
                1,
                0
              ]
            }
          },
          uniqueCases: { $addToSet: '$uhid' },
          uniqueDepartments: { $addToSet: '$department' },
          firstSubmission: { $min: '$submittedAt' },
          lastSubmission: { $max: '$submittedAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          userId: '$_id',
          userName: '$userInfo.name',
          userEmail: '$userInfo.email',
          userRole: '$userInfo.role',
          totalSubmissions: 1,
          compliant: 1,
          nonCompliant: 1,
          uniqueCases: { $size: '$uniqueCases' },
          uniqueDepartments: { $size: '$uniqueDepartments' },
          complianceRate: {
            $cond: [
              { $gt: ['$totalSubmissions', 0] },
              { $round: [{ $multiply: [{ $divide: ['$compliant', '$totalSubmissions'] }, 100] }] },
              0
            ]
          },
          firstSubmission: 1,
          lastSubmission: 1
        }
      },
      { $sort: { totalSubmissions: -1 } }
    ]);

    res.json({
      dateRange: {
        start: startDate ? new Date(startDate) : null,
        end: endDate ? new Date(endDate) : null
      },
      users: userActivity,
      summary: {
        totalUsers: userActivity.length,
        totalSubmissions: userActivity.reduce((sum, u) => sum + u.totalSubmissions, 0),
        averageComplianceRate: userActivity.length > 0
          ? Math.round(userActivity.reduce((sum, u) => sum + u.complianceRate, 0) / userActivity.length)
          : 0
      }
    });
  } catch (err) {
    console.error('getUserActivityAnalytics error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Admission/IPID Statistics
exports.getAdmissionAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const Admission = require('../models/Admission');
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.admissionDate = {};
      if (startDate) dateFilter.admissionDate.$gte = new Date(startDate);
      if (endDate) dateFilter.admissionDate.$lte = new Date(endDate);
    }
    
    if (status) {
      dateFilter.status = status;
    }

    // Get admission statistics
    const admissionStats = await Admission.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgLengthOfStay: {
            $avg: {
              $cond: [
                { $ne: ['$dischargeDate', null] },
                {
                  $divide: [
                    { $subtract: ['$dischargeDate', '$admissionDate'] },
                    1000 * 60 * 60 * 24 // Convert to days
                  ]
                },
                null
              ]
            }
          }
        }
      }
    ]);

    // Get submissions per admission
    const submissionsPerAdmission = await AuditSubmission.aggregate([
      {
        $match: dateFilter.admissionDate ? {
          submittedAt: dateFilter.admissionDate
        } : {}
      },
      {
        $group: {
          _id: '$ipid',
          submissionCount: { $sum: 1 },
          departmentCount: { $addToSet: '$department' },
          compliantCount: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                1,
                0
              ]
            }
          },
          nonCompliantCount: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['NO']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          ipid: '$_id',
          submissionCount: 1,
          departmentCount: { $size: '$departmentCount' },
          complianceRate: {
            $cond: [
              { $gt: ['$submissionCount', 0] },
              { $round: [{ $multiply: [{ $divide: ['$compliantCount', '$submissionCount'] }, 100] }] },
              0
            ]
          }
        }
      },
      { $sort: { submissionCount: -1 } }
    ]);

    // Ward and Unit statistics
    const wardStats = await Admission.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$ward',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const unitStats = await Admission.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$unitNo',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      dateRange: {
        start: startDate ? new Date(startDate) : null,
        end: endDate ? new Date(endDate) : null
      },
      admissionStatus: admissionStats,
      submissionsPerAdmission: {
        average: submissionsPerAdmission.length > 0
          ? Math.round(submissionsPerAdmission.reduce((sum, a) => sum + a.submissionCount, 0) / submissionsPerAdmission.length)
          : 0,
        distribution: submissionsPerAdmission.slice(0, 20) // Top 20
      },
      wardDistribution: wardStats,
      unitDistribution: unitStats,
      summary: {
        totalAdmissions: admissionStats.reduce((sum, s) => sum + s.count, 0),
        totalIPIDs: submissionsPerAdmission.length,
        averageSubmissionsPerAdmission: submissionsPerAdmission.length > 0
          ? Math.round(submissionsPerAdmission.reduce((sum, a) => sum + a.submissionCount, 0) / submissionsPerAdmission.length)
          : 0
      }
    });
  } catch (err) {
    console.error('getAdmissionAnalytics error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Form Template Performance Analytics
exports.getFormTemplateAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    const FormTemplate = require('../models/FormTemplate');
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.submittedAt = {};
      if (startDate) dateFilter.submittedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.submittedAt.$lte = new Date(endDate);
    }
    
    if (departmentId) {
      dateFilter.department = departmentId;
    }

    const formStats = await AuditSubmission.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$formTemplate',
          totalSubmissions: { $sum: 1 },
          compliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                1,
                0
              ]
            }
          },
          nonCompliant: {
            $sum: {
              $cond: [
                { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['NO']] },
                1,
                0
              ]
            }
          },
          uniqueCases: { $addToSet: '$uhid' },
          uniqueDepartments: { $addToSet: '$department' }
        }
      },
      {
        $lookup: {
          from: 'formtemplates',
          localField: '_id',
          foreignField: '_id',
          as: 'formInfo'
        }
      },
      {
        $unwind: { path: '$formInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          formId: '$_id',
          formName: '$formInfo.name',
          formDescription: '$formInfo.description',
          isActive: '$formInfo.isActive',
          totalSubmissions: 1,
          compliant: 1,
          nonCompliant: 1,
          uniqueCases: { $size: '$uniqueCases' },
          uniqueDepartments: { $size: '$uniqueDepartments' },
          complianceRate: {
            $cond: [
              { $gt: ['$totalSubmissions', 0] },
              { $round: [{ $multiply: [{ $divide: ['$compliant', '$totalSubmissions'] }, 100] }] },
              0
            ]
          }
        }
      },
      { $sort: { totalSubmissions: -1 } }
    ]);

    res.json({
      dateRange: {
        start: startDate ? new Date(startDate) : null,
        end: endDate ? new Date(endDate) : null
      },
      forms: formStats,
      summary: {
        totalForms: formStats.length,
        totalSubmissions: formStats.reduce((sum, f) => sum + f.totalSubmissions, 0),
        averageComplianceRate: formStats.length > 0
          ? Math.round(formStats.reduce((sum, f) => sum + f.complianceRate, 0) / formStats.length)
          : 0
      }
    });
  } catch (err) {
    console.error('getFormTemplateAnalytics error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Comprehensive Dashboard Analytics (all-in-one endpoint)
exports.getComprehensiveAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.submittedAt = {};
      if (startDate) dateFilter.submittedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.submittedAt.$lte = new Date(endDate);
    }

    // Get all analytics in parallel
    const [
      timeSeriesDaily,
      timeSeriesWeekly,
      timeSeriesMonthly,
      userActivity,
      admissionStats,
      formStats,
      departmentStats
    ] = await Promise.all([
      // Daily trends (last 30 days)
      AuditSubmission.aggregate([
        {
          $match: {
            ...dateFilter,
            submittedAt: {
              $gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$submittedAt' },
              month: { $month: '$submittedAt' },
              day: { $dayOfMonth: '$submittedAt' }
            },
            total: { $sum: 1 },
            compliant: {
              $sum: {
                $cond: [
                  { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                  1,
                  0
                ]
              }
            },
            cases: { $addToSet: '$uhid' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 30 }
      ]),
      // Weekly trends (last 12 weeks)
      AuditSubmission.aggregate([
        {
          $match: {
            ...dateFilter,
            submittedAt: {
              $gte: startDate ? new Date(startDate) : new Date(Date.now() - 84 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$submittedAt' },
              week: { $week: '$submittedAt' }
            },
            total: { $sum: 1 },
            compliant: {
              $sum: {
                $cond: [
                  { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                  1,
                  0
                ]
              }
            },
            cases: { $addToSet: '$uhid' }
          }
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
        { $limit: 12 }
      ]),
      // Monthly trends (last 12 months)
      AuditSubmission.aggregate([
        {
          $match: {
            ...dateFilter,
            submittedAt: {
              $gte: startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$submittedAt' },
              month: { $month: '$submittedAt' }
            },
            total: { $sum: 1 },
            compliant: {
              $sum: {
                $cond: [
                  { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                  1,
                  0
                ]
              }
            },
            cases: { $addToSet: '$uhid' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
        { $limit: 12 }
      ]),
      // Top users
      AuditSubmission.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$submittedBy',
            total: { $sum: 1 },
            cases: { $addToSet: '$uhid' }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 10 }
      ]),
      // Admission stats
      AuditSubmission.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$ipid',
            submissionCount: { $sum: 1 },
            departments: { $addToSet: '$department' }
          }
        },
        {
          $group: {
            _id: null,
            totalAdmissions: { $sum: 1 },
            avgSubmissionsPerAdmission: { $avg: '$submissionCount' },
            avgDepartmentsPerAdmission: { $avg: { $size: '$departments' } }
          }
        }
      ]),
      // Form stats
      AuditSubmission.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$formTemplate',
            total: { $sum: 1 },
            cases: { $addToSet: '$uhid' }
          }
        },
        { $sort: { total: -1 } },
        { $limit: 10 }
      ]),
      // Department stats
      AuditSubmission.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$department',
            total: { $sum: 1 },
            compliant: {
              $sum: {
                $cond: [
                  { $in: [{ $toUpper: { $ifNull: ['$responseValue', '$yesNoNa'] } }, ['YES']] },
                  1,
                  0
                ]
              }
            },
            cases: { $addToSet: '$uhid' }
          }
        },
        { $sort: { total: -1 } }
      ])
    ]);

    // Format the data
    const formatTimeSeries = (data, format) => {
      return data.map(item => {
        let dateLabel = '';
        if (format === 'day') {
          dateLabel = new Date(item._id.year, item._id.month - 1, item._id.day).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
        } else if (format === 'week') {
          dateLabel = `Week ${item._id.week}, ${item._id.year}`;
        } else {
          dateLabel = new Date(item._id.year, item._id.month - 1, 1).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
          });
        }
        return {
          date: dateLabel,
          submissions: item.total,
          complianceRate: item.total > 0 ? Math.round((item.compliant / item.total) * 100) : 0,
          cases: item.cases.length
        };
      });
    };

    res.json({
      dateRange: {
        start: startDate ? new Date(startDate) : null,
        end: endDate ? new Date(endDate) : null
      },
      timeSeries: {
        daily: formatTimeSeries(timeSeriesDaily, 'day'),
        weekly: formatTimeSeries(timeSeriesWeekly, 'week'),
        monthly: formatTimeSeries(timeSeriesMonthly, 'month')
      },
      topUsers: userActivity.slice(0, 10).map(u => ({
        userId: u._id,
        totalSubmissions: u.total,
        uniqueCases: u.cases.length
      })),
      admissionStats: admissionStats[0] || {
        totalAdmissions: 0,
        avgSubmissionsPerAdmission: 0,
        avgDepartmentsPerAdmission: 0
      },
      topForms: formStats.slice(0, 10).map(f => ({
        formId: f._id,
        totalSubmissions: f.total,
        uniqueCases: f.cases.length
      })),
      departmentStats: departmentStats.map(d => ({
        departmentId: d._id,
        totalSubmissions: d.total,
        complianceRate: d.total > 0 ? Math.round((d.compliant / d.total) * 100) : 0,
        uniqueCases: d.cases.length
      }))
    });
  } catch (err) {
    console.error('getComprehensiveAnalytics error', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
