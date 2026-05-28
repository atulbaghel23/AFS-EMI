import User from '../models/User.js';
import Role from '../models/Role.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import SystemConfig from '../models/SystemConfig.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Helper to ensure default Admin role with full permissions
const ensureAdminRole = async () => {
  const fullPermissions = {
    dashboard: { read: true },
    customers: { read: true, create: true, update: true, delete: true },
    machines: { read: true, create: true, update: true, delete: true },
    financing: { read: true, create: true, update: true, delete: true },
    new_financing: { read: true, create: true },
    financed_machines: { read: true, update: true },
    settlements: { read: true, create: true, update: true, delete: true },
    employees: { read: true, create: true, update: true, delete: true },
    settings_parent: { read: true },
    settings_general: { read: true, update: true },
    settings_rbac: { read: true, update: true },
    fmc: { read: true, create: true, update: true, delete: true },
    service_desk: { read: true, create: true, update: true, delete: true }
  };

  try {
    let adminRole = await Role.findOne({ name: 'Admin' });
    if (!adminRole) {
      adminRole = await Role.create({
        name: 'Admin',
        description: 'Master Administrator with unrestricted access',
        permissions: fullPermissions
      });
    } else {
      adminRole.permissions = fullPermissions;
      await adminRole.save();
    }
    return adminRole;
  } catch (error) {
    console.error("Critical: Failed to sync Admin role", error);
    return null;
  }
};

export const login = async (req, res) => {
  const { email, password, role } = req.body;
  console.log("Login request:", req.body);
  try {
    let queryRole = role;
    if (role === 'OEM') {
      queryRole = { $in: ['OEM', 'SUPERVISOR'] };
    }
    let user = await User.findOne({ email, role: queryRole }).populate('roleId').populate('customerId');

    // Master Admin Auto-Assignment
    if (user && email === 'oem@liugong.com' && password === user.password) {
      const adminRole = await ensureAdminRole();
      if (!user.roleId || user.roleId.name !== 'Admin') {
        user.roleId = adminRole._id;
        await user.save();
        user = await User.findById(user._id).populate('roleId');
      }
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        customerId: user.customerId,
        supervisorId: user.supervisorId || null,
        type: user.type || user.customerId?.type,
        status: user.status,
        settings: user.settings,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email, password or role' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const register = async (req, res) => {
  const { name, email, password, role, customerId } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = await User.create({ name, email, password, role, customerId });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this identity not found' });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry to 10 minutes
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Check system SMTP configuration
    const config = await SystemConfig.findOne();
    const smtp = config?.smtp;

    if (smtp && smtp.host && smtp.user && smtp.pass) {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
      });

      const mailOptions = {
        from: smtp.from || 'no-reply@liugong.com',
        to: email,
        subject: 'LiuGong Account Recovery - One-Time Password (OTP)',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9; color: #333; max-width: 500px; margin: auto; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #f0883e; text-align: center;">LiuGong Account Recovery</h2>
            <p>You requested a password reset. Use the following One-Time Password (OTP) to recover your account. This OTP is valid for 10 minutes:</p>
            <div style="font-size: 24px; font-weight: bold; text-align: center; padding: 15px; background-color: #eee; border-radius: 4px; letter-spacing: 5px; color: #f0883e; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 12px; color: #777;">If you did not request this, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Email Sent] OTP email sent successfully to ${email}`);
    } else {
      console.log(`[SMTP Not Configured] OTP for ${email} is: ${otp}`);
    }

    res.json({ message: 'One-Time Password (OTP) has been sent to your registered email' });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: 'Internal server error during password recovery', error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetOtp || user.resetOtp !== otp || user.resetOtpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP code' });
    }

    // Set new password (pre-save hook hashes it)
    user.password = password;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    res.json({ message: 'Password recovery successful. Please log in with your new cipher.' });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: 'Internal server error during password reset', error: error.message });
  }
};
