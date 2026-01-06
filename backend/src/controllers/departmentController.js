const Department = require('../models/Department');
const AuditSubmission = require('../models/AuditSubmission');

exports.createDepartment = async (req, res) => {
  try {
    const { name, code } = req.body;
    const existing = await Department.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ message: 'Department with same name or code exists' });
    }
    const dept = await Department.create({ name, code });
    res.status(201).json(dept);
  } catch (err) {
    console.error('createDepartment error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, isActive } = req.body;
    const dept = await Department.findByIdAndUpdate(
      id,
      { name, code, isActive },
      { new: true }
    );
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    console.error('updateDepartment error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    await Department.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    console.error('deleteDepartment error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listDepartments = async (_req, res) => {
  try {
    const depts = await Department.find().sort({ name: 1 });
    res.json(depts);
  } catch (err) {
    console.error('listDepartments error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get department activity logs (submissions, edits, etc.)
exports.getDepartmentLogs = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const userId = req.user.sub;
    const User = require('../models/User');
    const user = await User.findById(userId).populate('department');
    
    // If user is not admin, filter by their department
    let targetDepartmentId = departmentId;
    if (user.role !== 'admin' && user.department) {
      targetDepartmentId = user.department._id.toString();
    }

    // Get all departments if no specific department requested (admin only)
    const departments = targetDepartmentId 
      ? [await Department.findById(targetDepartmentId)]
      : user.role === 'admin' 
        ? await Department.find({ isActive: true }).sort({ name: 1 })
        : user.department ? [user.department] : [];

    const departmentLogs = [];

    for (const dept of departments) {
      if (!dept) continue;

      const deptFilter = { department: dept._id };

      // Get all submissions for this department, grouped by form (UHID + submittedAt rounded to second)
      // Use aggregation to get unique form submissions - group by UHID and submittedAt (rounded to nearest second)
      const formSubmissions = await AuditSubmission.aggregate([
        { $match: deptFilter },
        {
          $addFields: {
            // Round submittedAt to nearest second for grouping
            submittedAtRounded: {
              $dateFromParts: {
                year: { $year: '$submittedAt' },
                month: { $month: '$submittedAt' },
                day: { $dayOfMonth: '$submittedAt' },
                hour: { $hour: '$submittedAt' },
                minute: { $minute: '$submittedAt' },
                second: { $second: '$submittedAt' }
              }
            }
          }
        },
        {
          $group: {
            _id: {
              uhid: '$uhid',
              submittedAt: '$submittedAtRounded',
              department: '$department'
            },
            // Take the first submission's data as representative
            firstSubmissionId: { $first: '$_id' },
            patientName: { $first: '$patientName' },
            submittedAt: { $first: '$submittedAt' },
            createdAt: { $first: '$createdAt' },
            updatedAt: { $max: '$updatedAt' },
            submittedBy: { $first: '$submittedBy' },
            // Count how many checklist items in this form
            itemCount: { $sum: 1 }
          }
        },
        { $sort: { submittedAt: -1 } },
        { $limit: 100 }
      ]);

      // Populate the submittedBy field
      const User = require('../models/User');
      const Patient = require('../models/Patient');
      
      const submissions = await Promise.all(formSubmissions.map(async (formSub) => {
        const user = await User.findById(formSub.submittedBy).select('name email');
        return {
          _id: formSub.firstSubmissionId,
          uhid: formSub._id.uhid,
          patientName: formSub.patientName,
          submittedAt: formSub.submittedAt,
          createdAt: formSub.createdAt || formSub.submittedAt,
          updatedAt: formSub.updatedAt || formSub.submittedAt,
          submittedBy: user ? { name: user.name, email: user.email } : null,
          itemCount: formSub.itemCount
        };
      }));

      // Count unique forms (unique UHIDs)
      const uniqueUHIDs = new Set();
      submissions.forEach(sub => {
        if (sub.uhid) uniqueUHIDs.add(sub.uhid);
      });

      // Group submissions by date
      const submissionsByDate = {};
      submissions.forEach(sub => {
        const dateKey = sub.submittedAt.toISOString().split('T')[0];
        if (!submissionsByDate[dateKey]) {
          submissionsByDate[dateKey] = [];
        }
        submissionsByDate[dateKey].push({
          id: sub._id,
          uhid: sub.uhid,
          patientName: sub.patientName,
          submittedAt: sub.submittedAt,
          submittedBy: sub.submittedBy?.name || 'Unknown',
        });
      });

      // Find recently edited forms (where updatedAt > createdAt)
      // Group by form (UHID + submittedAt) to show only unique form submissions
      const editedSubmissions = submissions.filter(sub => {
        // Check if updatedAt is significantly different from createdAt (more than 1 second)
        const createdAt = sub.createdAt ? new Date(sub.createdAt) : new Date(sub.submittedAt);
        const updatedAt = sub.updatedAt ? new Date(sub.updatedAt) : new Date(sub.submittedAt);
        return updatedAt.getTime() - createdAt.getTime() > 1000; // More than 1 second difference
      });
      
      // Group edited submissions by form (UHID + submittedAt)
      const editedFormsMap = new Map();
      editedSubmissions.forEach(sub => {
        const submittedAtTime = new Date(sub.submittedAt).getTime();
        const roundedTime = Math.floor(submittedAtTime / 1000) * 1000;
        const formKey = `${sub.uhid}_${roundedTime}`;
        
        if (!editedFormsMap.has(formKey)) {
          editedFormsMap.set(formKey, {
            id: sub._id,
            uhid: sub.uhid,
            patientName: sub.patientName,
            submittedAt: sub.submittedAt,
            updatedAt: sub.updatedAt,
            editedAt: sub.updatedAt,
            submittedBy: sub.submittedBy?.name || 'Unknown',
          });
        } else {
          // Keep the most recently edited one
          const existing = editedFormsMap.get(formKey);
          if (new Date(sub.updatedAt) > new Date(existing.editedAt)) {
            existing.updatedAt = sub.updatedAt;
            existing.editedAt = sub.updatedAt;
          }
        }
      });
      
      const recentlyEdited = Array.from(editedFormsMap.values())
        .sort((a, b) => new Date(b.editedAt) - new Date(a.editedAt));

      // Get latest submission date
      const latestSubmission = submissions.length > 0 
        ? submissions[0].submittedAt 
        : null;

      // Get submission count by date (for chart/statistics)
      const submissionDates = Object.keys(submissionsByDate)
        .sort()
        .reverse()
        .map(date => ({
          date,
          count: submissionsByDate[date].length,
          uniqueForms: new Set(submissionsByDate[date].map(s => s.uhid)).size,
        }));

      // Group submissions by patient (UHID)
      const submissionsByPatient = {};
      submissions.forEach(sub => {
        const uhid = sub.uhid;
        if (!submissionsByPatient[uhid]) {
          submissionsByPatient[uhid] = {
            uhid: uhid,
            patientName: sub.patientName,
            submissions: [],
            firstSubmission: sub.submittedAt,
            lastSubmission: sub.submittedAt,
            editedCount: 0,
          };
        }
        const createdAt = sub.createdAt ? new Date(sub.createdAt) : new Date(sub.submittedAt);
        const updatedAt = sub.updatedAt ? new Date(sub.updatedAt) : new Date(sub.submittedAt);
        const isEdited = updatedAt.getTime() - createdAt.getTime() > 1000;
        
        submissionsByPatient[uhid].submissions.push({
          id: sub._id,
          submittedAt: sub.submittedAt,
          updatedAt: sub.updatedAt || sub.submittedAt,
          isEdited: isEdited,
          submittedBy: sub.submittedBy?.name || 'Unknown',
        });
        
        if (sub.submittedAt < submissionsByPatient[uhid].firstSubmission) {
          submissionsByPatient[uhid].firstSubmission = sub.submittedAt;
        }
        if (sub.submittedAt > submissionsByPatient[uhid].lastSubmission) {
          submissionsByPatient[uhid].lastSubmission = sub.submittedAt;
        }
        if (isEdited) {
          submissionsByPatient[uhid].editedCount++;
        }
      });

      // Convert to array and sort by last submission date
      const patientsList = Object.values(submissionsByPatient)
        .map(patient => ({
          ...patient,
          submissionCount: patient.submissions.length,
        }))
        .sort((a, b) => new Date(b.lastSubmission) - new Date(a.lastSubmission));

      departmentLogs.push({
        department: {
          _id: dept._id,
          name: dept.name,
          code: dept.code,
        },
        totalFormsSubmitted: uniqueUHIDs.size,
        totalSubmissions: submissions.length,
        latestSubmissionDate: latestSubmission,
        submissionDates: submissionDates.slice(0, 30), // Last 30 days
        recentlyEdited: recentlyEdited.slice(0, 20), // Last 20 edited forms
        recentlyEditedCount: recentlyEdited.length,
        patients: patientsList, // Grouped by patient ID
        // Use the already-grouped form submissions (one per form submission)
        allSubmissions: submissions.map(sub => {
          const createdAt = sub.createdAt ? new Date(sub.createdAt) : new Date(sub.submittedAt);
          const updatedAt = sub.updatedAt ? new Date(sub.updatedAt) : new Date(sub.submittedAt);
          return {
            id: sub._id,
            uhid: sub.uhid,
            patientName: sub.patientName,
            submittedAt: sub.submittedAt,
            updatedAt: sub.updatedAt || sub.submittedAt,
            isEdited: updatedAt.getTime() - createdAt.getTime() > 1000,
            submittedBy: sub.submittedBy?.name || 'Unknown',
          };
        }),
      });
    }

    res.json({
      departments: departmentLogs,
      totalDepartments: departmentLogs.length,
    });
  } catch (err) {
    console.error('getDepartmentLogs error', err);
    res.status(500).json({ message: 'Server error' });
  }
};


