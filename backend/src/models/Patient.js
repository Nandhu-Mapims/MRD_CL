const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    uhid: {
      type: String,
      required: true,
      unique: true, // UHID must be globally unique (creates index automatically)
      trim: true,
      uppercase: true, // Store in uppercase for consistency
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
    ward: { type: String, trim: true, required: true },
    unitNo: { type: String, trim: true, required: true },
  },
  { timestamps: true }
);

// Note: uhid already has a unique index from the schema definition above
// Additional compound indexes can be added here if needed

module.exports = mongoose.model('Patient', patientSchema);

