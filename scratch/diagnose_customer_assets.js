import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

import User from '../backend/models/User.js';
import Loan from '../backend/models/Loan.js';
import Machine from '../backend/models/Machine.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    // 1. Fetch User (Atul Baghele)
    const user = await User.findOne({ name: /Atul Baghele/i }).lean();
    console.log("1. User found:", user.name, "role:", user.role, "customerId:", user.customerId);

    // 2. Fetch Loans
    const loans = await Loan.find({}).lean();
    console.log("2. Total Loans in DB:", loans.length);

    // 3. Fetch FMC Contracts
    const Contract = mongoose.model('FMCContract', new mongoose.Schema({}, { strict: false }), 'fmccontracts');
    const fmcContracts = await Contract.find({}).lean();
    console.log("3. Total FMC Contracts in DB:", fmcContracts.length);

    // 4. Fetch Machines
    const machines = await Machine.find({}).lean();
    console.log("4. Total Machines in DB:", machines.length);

    // Replicate Frontend matching logic:
    const userCustId = (user.customerId?._id || user.customerId)?.toString();
    console.log("\n--- Frontend Evaluation ---");
    console.log("userCustId derived:", userCustId);

    // Show financed machines (even if invoice is pending)
    const clientLoans = loans.filter(l => {
      const loanCustId = (l.customerId?._id || l.customerId)?.toString();
      return loanCustId && userCustId && loanCustId === userCustId;
    });
    console.log("clientLoans matched:", clientLoans.length);

    // Show FMC contracted machines
    const myContracts = fmcContracts.filter(c =>
      (c.customerId && userCustId && c.customerId.toString() === userCustId) ||
      (c.customerName === user.name)
    );
    console.log("myContracts matched:", myContracts.length);
    if (myContracts.length > 0) {
      console.log("Matched Contract details:", {
        _id: myContracts[0]._id,
        customerName: myContracts[0].customerName,
        customerId: myContracts[0].customerId,
        machines: myContracts[0].machines
      });
    }

    const baseMachines = [];
    clientLoans.forEach(l => {
       const masterMachine = machines.find(m => m._id?.toString() === l.machineId?.toString() || (m.name || '').toLowerCase().trim() === (l.machineName || '').toLowerCase().trim());
       if (masterMachine) {
          baseMachines.push({ ...masterMachine, _assetId: l._id, _loan: l });
       }
    });
    console.log("baseMachines count after loans:", baseMachines.length);

    myContracts.forEach(c => {
       (c.machines || []).forEach(mId => {
          const masterMachine = machines.find(m => m._id?.toString() === mId.toString());
          if (masterMachine) {
             baseMachines.push({ ...masterMachine, _assetId: c._id + '_' + masterMachine._id, _fmc: c });
          } else {
             console.log("Could NOT find machine in catalog with ID:", mId);
          }
       });
    });
    console.log("baseMachines count after contracts:", baseMachines.length);

    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
