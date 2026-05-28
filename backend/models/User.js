import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  customId: { type: String },
   email: { type: String, required: true, unique: true },
   phone: { type: String },
   password: { type: String, required: true },
  role: { type: String, enum: ['OEM', 'CUSTOMER', 'SUPERVISOR'], required: true },
  roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }, // Fine-grained RBAC
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' }, // Only for CUSTOMER role
  supervisorId: { type: mongoose.Schema.Types.ObjectId, ref: 'FMCSupervisor' }, // Only for SUPERVISOR role
  type: { type: String }, // For CUSTOMER role: EMI, Rental, or FMC
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  settings: {
    fontFamily: { type: String, default: 'Inter' },
    fontSize: { type: String, default: '14' } // Numeric string for scaling
  },
  resetOtp: { type: String },
  resetOtpExpires: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

export default mongoose.model('User', userSchema);
