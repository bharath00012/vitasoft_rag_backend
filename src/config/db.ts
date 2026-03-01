import mongoose from "mongoose";

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/ragdb");
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection failed");
    process.exit(1);
  }
};