const AuditSubmission = require('../models/AuditSubmission');
const Patient = require('../models/Patient');
const Admission = require('../models/Admission');
const Notification = require('../models/Notification');

// Get all patients (IPIDs) assigned to this chief
exports.getChiefPatients = async (req, res) => {
  try {
    const { chiefName } = req.query;
    
    if (!chiefName || !chiefName.trim()) {
      return res.status(400).json({ message: 'Chief name is required' });
    }

    // Get all unique IPIDs where this chief is tagged
    const submissions = await AuditSubmission.find({
      unitChief: chiefName.trim(),
    })
      .populate('patient', 'uhid patientName')
      .populate('admission', 'ipid ward unitNo admissionDate')
      .populate('department', 'name code')
      .sort({ submittedAt: -1 });

    // Group by IPID
    const patientsMap = {};
    submissions.forEach((sub) => {
      const ipid = sub.ipid || sub.admission?.ipid;
      if (!ipid) return;

      if (!patientsMap[ipid]) {
        patientsMap[ipid] = {
          ipid: ipid,
          uhid: sub.uhid || sub.patient?.uhid,
          patientName: sub.patientName || sub.patient?.patientName,
          ward: sub.admission?.ward,
          unitNo: sub.admission?.unitNo,
          admissionDate: sub.admission?.admissionDate,
          departments: new Set(),
          totalSubmissions: 0,
          submissionsWithActions: 0,
          lastSubmittedAt: sub.submittedAt,
        };
      }

      patientsMap[ipid].totalSubmissions++;
      if (sub.corrective || sub.preventive) {
        patientsMap[ipid].submissionsWithActions++;
      }
      if (sub.department) {
        patientsMap[ipid].departments.add(sub.department.name);
      }
      if (sub.submittedAt > patientsMap[ipid].lastSubmittedAt) {
        patientsMap[ipid].lastSubmittedAt = sub.submittedAt;
      }
    });

    // Convert to array
    const patients = Object.values(patientsMap).map((p) => ({
      ...p,
      departments: Array.from(p.departments),
    }));

    res.json(patients);
  } catch (err) {
    console.error('getChiefPatients error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all submissions for a specific IPID assigned to this chief
exports.getChiefPatientSubmissions = async (req, res) => {
  try {
    const { ipid, chiefName } = req.query;

    if (!ipid || !ipid.trim()) {
      return res.status(400).json({ message: 'IPID is required' });
    }
    if (!chiefName || !chiefName.trim()) {
      return res.status(400).json({ message: 'Chief name is required' });
    }

    const submissions = await AuditSubmission.find({
      ipid: ipid.trim().toUpperCase(),
      unitChief: chiefName.trim(),
    })
      .populate('patient', 'uhid patientName')
      .populate('admission', 'ipid ward unitNo admissionDate')
      .populate('department', 'name code')
      .populate('checklistItemId', 'label description responseType isMandatory')
      .populate('submittedBy', 'name email')
      .populate('correctivePreventiveBy', 'name email')
      .sort({ submittedAt: -1 });

    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No submissions found for this IPID and chief' });
    }

    // Group by department
    const byDepartment = {};
    submissions.forEach((sub) => {
      const deptId = sub.department?._id?.toString() || 'unknown';
      if (!byDepartment[deptId]) {
        byDepartment[deptId] = {
          department: sub.department,
          submissions: [],
        };
      }
      byDepartment[deptId].submissions.push(sub);
    });

    res.json({
      ipid: ipid.trim().toUpperCase(),
      patient: submissions[0]?.patient,
      admission: submissions[0]?.admission,
      departments: Object.values(byDepartment),
    });
  } catch (err) {
    console.error('getChiefPatientSubmissions error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update corrective and preventive actions for a submission
// NOTE: Chiefs can ONLY update corrective/preventive fields
// Original checklist data (responseValue, remarks, responsibility) remains READ-ONLY
exports.updateCorrectivePreventive = async (req, res) => {
  try {
    const { id } = req.params;
    const { corrective, preventive } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const submission = await AuditSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // SECURITY: Only update corrective/preventive fields
    // Original submission data (responseValue, remarks, responsibility, etc.) is protected
    submission.corrective = corrective?.trim() || '';
    submission.preventive = preventive?.trim() || '';
    submission.correctivePreventiveBy = userId;
    submission.correctivePreventiveAt = new Date();

    await submission.save();

    // Create notification for submitting doctor (if available)
    if (submission.submittedBy) {
      try {
        await Notification.create({
          user: submission.submittedBy,
          title: 'Corrective & Preventive Actions Added',
          message: `Chief has updated corrective and preventive actions for UHID ${submission.uhid} (IPID ${submission.ipid || 'N/A'}).`,
          type: 'action',
        });
      } catch (notifyErr) {
        // Log but don't block main flow
        console.error('Notification create error (updateCorrectivePreventive):', notifyErr);
      }
    }

    // Populate before sending response
    await submission.populate('correctivePreventiveBy', 'name email');

    res.json(submission);
  } catch (err) {
    console.error('updateCorrectivePreventive error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Bulk update corrective and preventive actions for multiple submissions
// NOTE: Chiefs can ONLY update corrective/preventive fields
// Original checklist data (responseValue, remarks, responsibility) remains READ-ONLY
exports.bulkUpdateCorrectivePreventive = async (req, res) => {
  try {
    const { ipid, chiefName, corrective, preventive } = req.body;
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!ipid || !ipid.trim()) {
      return res.status(400).json({ message: 'IPID is required' });
    }

    // Find all submissions for this IPID and chief
    const filter = {
      ipid: ipid.trim().toUpperCase(),
    };
    if (chiefName) {
      filter.unitChief = chiefName.trim();
    }

    // Find matching submissions first (needed to notify individual doctors)
    const submissions = await AuditSubmission.find(filter).select(
      '_id submittedBy uhid ipid'
    );

    if (!submissions || submissions.length === 0) {
      return res.status(404).json({ message: 'No submissions found for this IPID/chief' });
    }

    // SECURITY: Only update corrective/preventive fields
    // Original submission data (responseValue, remarks, responsibility, etc.) is protected
    const result = await AuditSubmission.updateMany(filter, {
      corrective: corrective?.trim() || '',
      preventive: preventive?.trim() || '',
      correctivePreventiveBy: userId,
      correctivePreventiveAt: new Date(),
    });

    // Create notifications for distinct submitting doctors
    const notifiedUserIds = new Set();
    const notificationDocs = [];
    submissions.forEach((sub) => {
      if (!sub.submittedBy) return;
      const key = sub.submittedBy.toString();
      if (notifiedUserIds.has(key)) return;
      notifiedUserIds.add(key);

      notificationDocs.push({
        user: sub.submittedBy,
        title: 'Corrective & Preventive Actions Added',
        message: `Chief has updated corrective and preventive actions for UHID ${sub.uhid} (IPID ${sub.ipid || 'N/A'}).`,
        type: 'action',
      });
    });

    if (notificationDocs.length) {
      try {
        await Notification.insertMany(notificationDocs);
      } catch (notifyErr) {
        console.error('Notification insert error (bulkUpdateCorrectivePreventive):', notifyErr);
      }
    }

    res.json({
      message: 'Corrective and preventive actions updated successfully',
      modifiedCount: result.modifiedCount,
      notifiedDoctors: notificationDocs.length,
    });
  } catch (err) {
    console.error('bulkUpdateCorrectivePreventive error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get doctor performance analytics for this chief
exports.getDoctorPerformance = async (req, res) => {
  try {
    const { chiefName } = req.query;

    if (!chiefName || !chiefName.trim()) {
      return res.status(400).json({ message: 'Chief name is required' });
    }

    // Get all submissions for this chief
    const submissions = await AuditSubmission.find({
      unitChief: chiefName.trim(),
    })
      .populate('submittedBy', 'name email role')
      .populate('department', 'name code')
      .sort({ submittedAt: -1 });

    // Group by doctor (submittedBy)
    const doctorStats = {};

    submissions.forEach((sub) => {
      const doctorId = sub.submittedBy?._id?.toString();
      if (!doctorId) return;

      if (!doctorStats[doctorId]) {
        doctorStats[doctorId] = {
          doctor: {
            id: doctorId,
            name: sub.submittedBy.name,
            email: sub.submittedBy.email,
            role: sub.submittedBy.role,
          },
          totalSubmissions: 0,
          compliantSubmissions: 0, // YES responses
          nonCompliantSubmissions: 0, // NO responses
          departments: new Set(),
          patients: new Set(),
          lastSubmittedAt: sub.submittedAt,
          firstSubmittedAt: sub.submittedAt,
        };
      }

      const stats = doctorStats[doctorId];
      stats.totalSubmissions++;

      // Track compliance (YES = compliant, NO = non-compliant)
      if (sub.responseValue === 'YES') {
        stats.compliantSubmissions++;
      } else if (sub.responseValue === 'NO') {
        stats.nonCompliantSubmissions++;
      }

      // Track departments and patients
      if (sub.department?._id) {
        stats.departments.add(sub.department.name);
      }
      if (sub.ipid) {
        stats.patients.add(sub.ipid);
      }

      // Update timestamps
      if (sub.submittedAt > stats.lastSubmittedAt) {
        stats.lastSubmittedAt = sub.submittedAt;
      }
      if (sub.submittedAt < stats.firstSubmittedAt) {
        stats.firstSubmittedAt = sub.submittedAt;
      }
    });

    // Convert to array and calculate percentages
    const performanceData = Object.values(doctorStats).map((stats) => {
      const complianceRate = stats.totalSubmissions > 0
        ? ((stats.compliantSubmissions / stats.totalSubmissions) * 100).toFixed(1)
        : 0;

      return {
        doctor: stats.doctor,
        totalSubmissions: stats.totalSubmissions,
        compliantSubmissions: stats.compliantSubmissions,
        nonCompliantSubmissions: stats.nonCompliantSubmissions,
        complianceRate: parseFloat(complianceRate),
        departments: Array.from(stats.departments),
        totalPatients: stats.patients.size,
        lastSubmittedAt: stats.lastSubmittedAt,
        firstSubmittedAt: stats.firstSubmittedAt,
      };
    });

    // Sort by total submissions (most active first)
    performanceData.sort((a, b) => b.totalSubmissions - a.totalSubmissions);

    res.json({
      chiefName: chiefName.trim(),
      totalDoctors: performanceData.length,
      doctors: performanceData,
    });
  } catch (err) {
    console.error('getDoctorPerformance error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
