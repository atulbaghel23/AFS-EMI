import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

import Loan from '../backend/models/Loan.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const loans = await Loan.find({ customerId: new mongoose.Types.ObjectId('6a44ad967671408c385570b2') }).lean();
    console.log("ATUL'S LOANS DETAILS:");
    loans.forEach(l => {
      console.log(`ID: ${l._id}, Machine: ${l.machineName}, approvalStatus: ${l.approvalStatus}, status: ${l.status}`);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
