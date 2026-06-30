import mongoose from 'mongoose';

const blacklistedTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: '30d' }
});

export default mongoose.model('BlacklistedToken', blacklistedTokenSchema);
