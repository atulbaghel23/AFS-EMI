import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config({ path: './backend/.env' });

import User from '../backend/models/User.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    // Find customer Atul Baghele
    const user = await User.findOne({ name: /Atul Baghele/i }).lean();
    
    // Generate a web token for this user
    const secret = process.env.JWT_SECRET_WEB || process.env.JWT_SECRET;
    const token = jwt.sign({ id: user._id, source: 'web' }, secret, { expiresIn: '1d' });
    
    console.log("Simulating API fetch for /api/fmc/contracts using token...");
    
    // We can import the router or just call the database find matching what contracts.getAll does
    const Contract = mongoose.model('FMCContract', new mongoose.Schema({}, { strict: false }), 'fmccontracts');
    const contracts = await Contract.find().sort({ createdAt: -1 });
    
    console.log("Total contracts found:", contracts.length);
    console.log("Contracts list:", contracts.map(c => ({
      _id: c._id,
      customerName: c.customerName,
      customerId: c.customerId,
      machinesCount: (c.machines || []).length
    })));
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
