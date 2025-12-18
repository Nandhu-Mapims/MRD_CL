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
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
      default: 'OPEN',
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries: Patient + Department reference
auditSubmissionSchema.index({ patient: 1, department: 1 });
auditSubmissionSchema.index({ uhid: 1, department: 1 }); // For backward compatibility queries

module.exports = mongoose.model('AuditSubmission', auditSubmissionSchema);


