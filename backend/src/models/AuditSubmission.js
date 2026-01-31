const mongoose = require('mongoose');

const auditSubmissionSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    formTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FormTemplate',
      required: false,
    },
    // Patient reference - mandatory for every audit
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    // Keep uhid and patientName for backward compatibility and easy querying
    uhid: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    // IPID - unique for each admission
    ipid: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    // Unit Chief (optional)
    unitChief: {
      type: String,
      trim: true,
    },
    // Corrective action (filled by Unit Chief)
    corrective: {
      type: String,
      trim: true,
      default: '',
    },
    // Preventive action (filled by Unit Chief)
    preventive: {
      type: String,
      trim: true,
      default: '',
    },
    // Corrective/Preventive filled by
    correctivePreventiveBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Corrective/Preventive filled at
    correctivePreventiveAt: {
      type: Date,
    },
    // Admission reference
    admission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      required: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    checklistItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChecklistItem',
      required: true,
    },
    // Legacy field for backward compatibility
    yesNoNa: {
      type: String,
      enum: ['YES', 'NO'], // NA removed - only YES or NO allowed
      required: false, // Made optional to support new response types
    },
    // New flexible response value field
    responseValue: { type: String }, // Stores the actual response (YES/NO, checked/unchecked, text, number, etc.)
    remarks: { type: String },
    responsibility: { type: String },
    // Status field kept for backward compatibility but no longer used
    status: { type: String },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    // Audit date (date-only) and time for uniqueness: Dept+UHID+IPID+Date+Time
    auditDate: {
      type: Date,
      required: false,
      index: true,
    },
    auditTime: {
      type: String,
      trim: true,
      required: false,
      index: true,
    },
    // Lock flag to prevent editing after submission
    isLocked: {
      type: Boolean,
      default: true, // Locked by default - submissions cannot be edited once submitted
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
auditSubmissionSchema.index({ patient: 1, department: 1 });
auditSubmissionSchema.index({ uhid: 1, department: 1 });
auditSubmissionSchema.index({ ipid: 1, department: 1 }); // For admission-based queries
auditSubmissionSchema.index({ admission: 1, department: 1 }); // For admission-based queries
auditSubmissionSchema.index({ submittedAt: -1 }); // For time-based queries
auditSubmissionSchema.index({ department: 1, submittedAt: -1 }); // For department performance queries
auditSubmissionSchema.index({ uhid: 1, submittedAt: -1 }); // For patient timeline queries
auditSubmissionSchema.index({ ipid: 1, submittedAt: -1 }); // For admission timeline queries
auditSubmissionSchema.index({ department: 1, formTemplate: 1 }); // For form-level queries
auditSubmissionSchema.index({ 'responseValue': 1 }); // For compliance queries
auditSubmissionSchema.index({ uhid: 1, ipid: 1, department: 1, auditDate: 1, auditTime: 1 }); // For duplicate check

module.exports = mongoose.model('AuditSubmission', auditSubmissionSchema);


