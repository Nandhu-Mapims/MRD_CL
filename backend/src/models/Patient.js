const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    uhid: {
      type: String,
      required: true,
      unique: true, // UHID must be globally unique
      trim: true,
      uppercase: true, // Store in uppercase for consistency
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    // Additional patient details can be added here
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    contactNumber: { type: String },
    address: { type: String },
  },
  { timestamps: true }
);

// Compound index for efficient queries
patientSchema.index({ uhid: 1 });

module.exports = mongoose.model('Patient', patientSchema);

