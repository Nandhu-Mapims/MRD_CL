const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const helmet = require('helmet');
const connectDB = require('./config/db');
const User = require('./models/User');
const bcrypt = require('bcrypt');

dotenv.config();

const app = express();

// Trust proxy when behind nginx/Docker - required for correct client IP in rate limiting
app.set('trust proxy', 1);

// Security: Helmet.js for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow iframe embedding if needed
}));

// Middleware
// CORS configuration - restrict to frontend origin
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
// Security: Limit request body size to prevent DoS attacks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// DB connection and auto-create default admin user
(async () => {
  try {
    await connectDB();
    
    // Auto-create default admin user if it doesn't exist
    const adminEmail = 'admin@hospital.com';
    const adminPassword = 'TataTiago@2026';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: 'System Administrator',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Auto-created default admin user');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
    } else {
      // Update password if admin exists (for deployment consistency)
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      existingAdmin.passwordHash = passwordHash;
      existingAdmin.isActive = true;
      await existingAdmin.save();
      console.log('✅ Updated default admin user password');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
    }
  } catch (err) {
    console.error('Error creating/updating admin user:', err);
    // Don't exit - let server continue even if admin creation fails
  }
})();

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/checklists', require('./routes/checklistRoutes'));
app.use('/api/audits', require('./routes/auditRoutes'));
app.use('/api/form-templates', require('./routes/formTemplateRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/admissions', require('./routes/admissionRoutes'));
app.use('/api/chief-doctors', require('./routes/chiefDoctorRoutes'));
app.use('/api/chief', require('./routes/chiefRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/master-data', require('./routes/masterDataRoutes'));

app.get('/', (_req, res) => {
  res.json({ status: 'MRD Audit API running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;


