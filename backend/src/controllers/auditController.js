const AuditSubmission = require('../models/AuditSubmission');
const Patient = require('../models/Patient');

// User submit audit
exports.submitAudit = async (req, res) => {
  try {
    const { uhid, patientName, departmentId, formTemplateId, items, ward, unitNo } = req.body;
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

    // Find or create patient
    let patient = await Patient.findOne({ uhid: normalizedUHID });
    if (!patient) {
      patient = await Patient.create({
        uhid: normalizedUHID,
        patientName: normalizedPatientName,
        ward: ward.trim(),
        unitNo: unitNo.trim(),
      });
    } else {
      if (patient.patientName !== normalizedPatientName) {
        patient.patientName = normalizedPatientName;
      }
      if (ward !== undefined && ward !== null) {
        patient.ward = ward.trim() || undefined;
      }
      if (unitNo !== undefined && unitNo !== null) {
        patient.unitNo = unitNo.trim() || undefined;
      }
      await patient.save();
    }

    // Create audit submissions with patient reference - all locked by default
    const docs = items.map((it) => ({
      department: departmentId,
      formTemplate: formTemplateId || undefined,
      patient: patient._id,
      uhid: normalizedUHID,
      patientName: normalizedPatientName,
      checklistItemId: it.checklistItemId,
      yesNoNa: it.yesNoNa || undefined,
      responseValue: it.responseValue || it.yesNoNa || '',
      remarks: it.remarks || '',
      responsibility: it.responsibility || '',
      status: it.status && it.status.trim() ? it.status : undefined,
      submittedBy: userId,
      submittedAt: new Date(),
      isLocked: true,
    }));

    const created = await AuditSubmission.insertMany(docs);
    await AuditSubmission.populate(created, { path: 'patient', select: 'uhid patientName' });
    
    res.status(201).json(created);
  } catch (err) {
    console.error('submitAudit error', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'UHID already exists. Please use a unique UHID.' });
    }
    res.status(500).json({ message: 'Server error' });
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
      .populate('department')
      .populate('patient', 'uhid patientName ward unitNo')
      .populate('checklistItemId')
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
            openIssues: {
              $sum: {
                $cond: [{ $ne: ['$status', 'CLOSED'] }, 1, 0]
              }
            },
            closedIssues: {
              $sum: {
                $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0]
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
            totalOpenIssues: {
              $sum: {
                $cond: [{ $ne: ['$status', 'CLOSED'] }, 1, 0]
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
        totalOpenIssues: 0,
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
    const submissions = await AuditSubmission.find({ uhid: normalizedUHID })
      .populate('department')
      .populate('formTemplate')
      .populate('checklistItemId')
      .populate('submittedBy', 'name email')
      .populate('patient', 'uhid patientName ward unitNo')
      .sort({ submittedAt: -1 });

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No submissions found for this UHID' });
    }

    res.json(submissions);
  } catch (err) {
    console.error('getSubmissionsByUHID error', err);
    res.status(500).json({ message: 'Server error' });
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
              status: submission.status,
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
        'Status': sub.status || 'OPEN',
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
          closedIssues: {
            $sum: {
              $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0]
            }
          },
          openIssues: {
            $sum: {
              $cond: [{ $ne: ['$status', 'CLOSED'] }, 1, 0]
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
          closedIssues: {
            $sum: {
              $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0]
            }
          },
        }
      }
    ])

    const current = currentStats[0] || {
      totalSubmissions: 0,
      compliant: 0,
      nonCompliant: 0,
      closedIssues: 0,
      openIssues: 0,
    }

    const previous = previousStats[0] || {
      totalSubmissions: 0,
      compliant: 0,
      closedIssues: 0,
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
          cases: { $addToSet: '$uhid' },
          openIssues: {
            $sum: {
              $cond: [{ $ne: ['$status', 'CLOSED'] }, 1, 0]
            }
          }
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
          openIssues: 1,
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
      d.complianceRate < 70 || d.openIssues > (d.total * 0.2)
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
        closedIssues: current.closedIssues,
        openIssues: current.openIssues,
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
          openIssues: d.openIssues,
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

// ... existing code ...
