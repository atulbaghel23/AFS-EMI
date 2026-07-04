import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

import Loan from '../backend/models/Loan.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    // Set LT28J to Rental
    await Loan.updateOne({ _id: new mongoose.Types.ObjectId('6a462a71229adc32a6bbca2c') }, { $set: { financingType: 'Rental' } });
    
    // Set one LT32J to Rental
    await Loan.updateOne({ _id: new mongoose.Types.ObjectId('6a46026d907b942df2cb5e04') }, { $set: { financingType: 'Rental' } });
    
    // Set remaining to EMI explicitly
    await Loan.updateMany(
      { customerId: new mongoose.Types.ObjectId('6a44ad967671408c385570b2'), financingType: { $exists: false } },
      { $set: { financingType: 'EMI' } }
    );
    
    console.log("Loans financingType updated successfully.");
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
