import mongoose from 'mongoose';
import config from './config';

let isConnected = false;

export async function connectToDatabase(uri?: string): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whop';

  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri, {
  });

  isConnected = true;
  return mongoose;
}

export default connectToDatabase;


