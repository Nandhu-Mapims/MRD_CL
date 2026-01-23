const mongoose = require('mongoose');

const connectDB = async () => {
  // Build MongoDB URI from environment variables (handles special characters in password)
  let uri = process.env.MONGO_URI;
  
  if (!uri) {
    // Construct URI from individual components (handles special characters properly)
    const username = encodeURIComponent(process.env.MONGO_ROOT_USERNAME || 'admin');
    const password = encodeURIComponent(process.env.MONGO_ROOT_PASSWORD || '');
    const database = process.env.MONGO_DATABASE || 'mrd_audit';
    const host = process.env.MONGO_HOST || 'mongodb';
    const port = process.env.MONGO_PORT || '27017';
    
    uri = `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin`;
  }
  
  try {
    // With Mongoose 7+ the legacy options are no longer needed/supported
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error', err);
    process.exit(1);
  }
};

module.exports = connectDB;


