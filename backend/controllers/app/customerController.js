import Customer from '../../models/Customer.js';
import User from '../../models/User.js';
import SystemConfig from '../../models/SystemConfig.js';
import { sendNotification } from '../../services/notificationService.js';

export const getCustomers = async (req, res) => {
  try {
    let filter = {};
    if (req.user && req.user.role && req.user.role.toUpperCase() === 'CUSTOMER') {
      filter._id = req.user.customerId || null;
    }
    const customers = await Customer.find(filter).sort({ createdAt: -1 });
    res.json(
      {
        success: true,
        statusCode: 200,
        message: "Data retrieved successfully",
        data: { customers },
        error: null
      }
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const payload = { ...req.body };
    const config = await SystemConfig.findOne();

    // Auto-ID Generation
    if (config?.numbering?.customer?.mode === 'Auto' && !payload.customId) {
      const { prefix, nextNumber } = config.numbering.customer;
      payload.customId = `${prefix}${nextNumber.toString().padStart(4, '0')}`;
      config.numbering.customer.nextNumber += 1;
      await config.save();
    }

    // Unique Constraint Validation
    const duplicateCheck = [];
    if (payload.email) duplicateCheck.push({ email: payload.email });
    if (payload.mobile) duplicateCheck.push({ mobile: payload.mobile });
    if (payload.gst) duplicateCheck.push({ gst: payload.gst });
    if (payload.pan) duplicateCheck.push({ pan: payload.pan });
    if (payload.customId) duplicateCheck.push({ customId: payload.customId });

    if (duplicateCheck.length > 0) {
      const existing = await Customer.findOne({ $or: duplicateCheck });
      if (existing) {
        let field = 'Identity Property';
        if (existing.email === payload.email) field = 'Email';
        if (existing.mobile === payload.mobile) field = 'Mobile';
        if (existing.gst === payload.gst) field = 'GSTIN';
        if (existing.pan === payload.pan) field = 'PAN';
        if (existing.customId === payload.customId) field = 'Customer ID';
        return res.status(400).json({ message: `Protocol Conflict: ${field} already registered in the system.` });
      }
    }

    // Generate a secure random 10-character alphanumeric password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPassword = '';
    for (let i = 0; i < 10; i++) {
      randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const password = req.body.password || randomPassword;
    payload.password = password;
    console.log(`[Customer Onboarding] Password for ${payload.email}: ${password}`);

    const newCustomer = await Customer.create(payload);

    try {
      if (newCustomer.email) {
        // Check if user already exists
        const existingUser = await User.findOne({ email: newCustomer.email });
        if (existingUser) {
          return res.status(400).json({ message: 'A user account with this email already exists in the system.' });
        }

        await User.create({
          name: newCustomer.name,
          email: newCustomer.email,
          password: password,
          role: 'CUSTOMER',
          customerId: newCustomer._id,
          type: newCustomer.type,
          mustResetPassword: true
        });

        // Trigger Notification
        sendNotification('customer_welcome', {
          email: newCustomer.email,
          name: newCustomer.name,
          username: newCustomer.email,
          password: password,
          customId: newCustomer.customId,
          loginUrl: 'http://localhost:5173'
        }).catch(err => console.error('Delayed Notify Error:', err));
      }
      res.status(201).json(newCustomer);
    } catch (userError) {
      // Rollback primary creation if secondary fails
      await Customer.findByIdAndDelete(newCustomer._id);
      res.status(400).json({ message: `Security Protocol Failure: ${userError.message}` });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });

    const userUpdate = { name: updatedCustomer.name, email: updatedCustomer.email, type: updatedCustomer.type };
    if (req.body.password) {
      const bcrypt = await import('bcryptjs');
      const salt = await bcrypt.default.genSalt(10);
      userUpdate.password = await bcrypt.default.hash(req.body.password, salt);
      updatedCustomer.password = req.body.password;
      await updatedCustomer.save();
    }

    await User.findOneAndUpdate(
      { customerId: updatedCustomer._id },
      userUpdate,
      { upsert: true, new: true }
    );

    res.json(updatedCustomer);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (customer) {
      await User.deleteMany({ customerId: customer._id });
      await Customer.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'Customer and associated user purged' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
