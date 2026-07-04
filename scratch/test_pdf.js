import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: './backend/.env' });

import '../backend/models/Customer.js'; // Register Customer Schema
import Loan from '../backend/models/Loan.js';
import { generateAgreementPDF } from '../backend/services/pdfService.js';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB.");
    const loan = await Loan.findOne({}).populate('customerId');
    if (!loan) {
      console.log("No loans found in database.");
      process.exit(0);
    }
    console.log(`Generating agreement PDF for Loan: ${loan._id} (Machine: ${loan.machineName})...`);
    
    try {
      const pdfBuffer = await generateAgreementPDF(loan);
      fs.writeFileSync('./scratch/test_agreement.pdf', pdfBuffer);
      console.log("PDF generated successfully and saved to './scratch/test_agreement.pdf'!");
    } catch (pdfError) {
      console.error("PDF generation failed:", pdfError);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection error:", err);
    process.exit(1);
  });
