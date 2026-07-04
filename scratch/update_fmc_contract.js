import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const Contract = mongoose.model('FMCContract', new mongoose.Schema({}, { strict: false }), 'fmccontracts');
    
    // Find contract for Atul Baghele (AGR-168373)
    const result = await Contract.updateOne(
      { agreementNumber: 'AGR-168373' },
      { $set: { machines: ['6a4385faa6a3fd05aebce8a1', '6a23f7f001589f97a21c99fc'] } }
    );
    
    console.log("Update result:", result);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
