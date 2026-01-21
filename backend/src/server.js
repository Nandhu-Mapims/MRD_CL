const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// DB
connectDB();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/checklists', require('./routes/checklistRoutes'));
app.use('/api/audits', require('./routes/auditRoutes'));
app.use('/api/form-templates', require('./routes/formTemplateRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/admissions', require('./routes/admissionRoutes'));

app.get('/', (_req, res) => {
  res.json({ status: 'MRD Audit API running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;


