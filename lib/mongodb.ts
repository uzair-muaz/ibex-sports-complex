import mongoose from "mongoose";
import { isBuildTime } from "./build-utils";

function getMongoDBUri(): string {
  if (!process.env.MONGODB_URI) {
    throw new Error("Please add your MONGODB_URI to .env.local");
  }
  return process.env.MONGODB_URI;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  // CRITICAL: During build, fail immediately to prevent hanging
  // Next.js analyzes server actions and route handlers during build
  if (isBuildTime()) {
    throw new Error('Database connection not available during build');
  }
  
  // If we already have a connection, verify it's still alive
  if (cached.conn) {
    try {
      // Quick check if connection is ready
      if (mongoose.connection.readyState === 1) {
        return cached.conn;
      }
    } catch (e) {
      // Connection is dead, clear it
      cached.conn = null;
      cached.promise = null;
    }
  }

  // If there's no connection and we're not building, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
      socketTimeoutMS: 30000, // 30 seconds for socket operations
      connectTimeoutMS: 10000, // 10 seconds to establish connection
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
    };

    const MONGODB_URI = getMongoDBUri();
    console.log('[MongoDB] Attempting to connect...');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('[MongoDB] Connected successfully');
      return mongoose;
    }).catch((error) => {
      console.error('[MongoDB] Connection failed:', error.message);
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
    // Verify connection is still alive
    if (mongoose.connection.readyState !== 1) {
      console.warn('[MongoDB] Connection state is not ready, reconnecting...');
      cached.conn = null;
      cached.promise = null;
      return connectDB(); // Retry once
    }
  } catch (e: any) {
    cached.promise = null;
    console.error('[MongoDB] Connection error:', e.message);
    throw new Error(`Database connection failed: ${e.message}`);
  }

  return cached.conn;
}

export default connectDB;
