import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  customId: { type: String, unique: true },
  mobile: String,
  email: String,
  status: { type: String, default: 'Active' },
  address: String,
  city: String,
  state: String,
  pin: String,
  gst: String,
  pan: String,
  bankAcc: String,
  ifsc: String,
  company: String,
  type: { type: [String], default: ['EMI'] },
  password: { type: String }
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
