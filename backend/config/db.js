import mongoose from 'mongoose';

export let isMongoConnected = false;

export const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatly';
  try {
    mongoose.set('strictQuery', false);
    // Timeout quickly (3 seconds) if local MongoDB is not running so server starts immediately in Fallback mode
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
    });
    isMongoConnected = true;
    console.log(`[Chatly DB] MongoDB connected successfully to ${mongoURI}`);
  } catch (error) {
    isMongoConnected = false;
    console.warn(`[Chatly DB] Could not connect to MongoDB (${error.message}). Running in High-Performance Memory Fallback Mode.`);
  }
};
