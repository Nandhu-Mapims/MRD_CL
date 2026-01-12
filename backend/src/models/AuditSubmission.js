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
      enum: ['YES', 'NO', 'NA'],
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
auditSubmissionSchema.index({ submittedAt: -1 }); // For time-based queries
auditSubmissionSchema.index({ department: 1, submittedAt: -1 }); // For department performance queries
auditSubmissionSchema.index({ uhid: 1, submittedAt: -1 }); // For patient timeline queries
auditSubmissionSchema.index({ department: 1, formTemplate: 1 }); // For form-level queries
auditSubmissionSchema.index({ 'responseValue': 1 }); // For compliance queries

module.exports = mongoose.model('AuditSubmission', auditSubmissionSchema);


