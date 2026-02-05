const mongoose = require('mongoose');

const connectDB = async (retries = 10, delay = 2000) => {
  // Build MongoDB URI from environment variables (handles special characters in password)
  let uri = process.env.MONGO_URI;
  
  if (!uri) {
    // Construct URI from individual components (handles special characters properly)
    const username = encodeURIComponent(process.env.MONGO_ROOT_USERNAME || 'admin');
    const password = encodeURIComponent(process.env.MONGO_ROOT_PASSWORD || '');
    const database = process.env.MONGO_DATABASE || 'mrd_audit';
    // In Docker, use service name 'mongodb'. Locally, use 'localhost'
    const host = process.env.MONGO_HOST || (process.env.NODE_ENV === 'production' ? 'mongodb' : 'localhost');
    const port = process.env.MONGO_PORT || '27017';
    
    uri = `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin`;
  }
  
  const hostDisplay = process.env.MONGO_HOST || (process.env.NODE_ENV === 'production' ? 'mongodb' : 'localhost');
  console.log(`Attempting to connect to MongoDB at ${hostDisplay}:${process.env.MONGO_PORT || '27017'}...`);
  
  for (let i = 0; i < retries; i++) {
    try {
      // With Mongoose 7+ the legacy options are no longer needed/supported
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      });
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (err) {
      const errorMsg = err.message || err.toString();
      console.error(`MongoDB connection attempt ${i + 1}/${retries} failed:`, errorMsg);
      
      if (i < retries - 1) {
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ Failed to connect to MongoDB after all retries');
        console.error('Please ensure:');
        console.error('  1. MongoDB container is running: docker-compose ps');
        console.error('  2. Containers are on the same network');
        console.error(`  3. MongoDB hostname is correct (current: ${hostDisplay})`);
        console.error('  4. MongoDB credentials are correct in .env file');
        if (errorMsg.includes('ENOTFOUND')) {
          console.error('  5. DNS resolution failed - check if MongoDB service name is correct');
        }
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;


