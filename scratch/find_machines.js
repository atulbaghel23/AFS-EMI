import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

import Machine from '../backend/models/Machine.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const machines = await Machine.find({
      name: { $in: ['906FE - (103KWH)', 'LT32J', 'LT28J'] }
    }, { name: 1, model: 1 }).lean();
    console.log("MATCHED MACHINES:", machines);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
