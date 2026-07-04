import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  financingType: { type: String, default: 'EMI' },
  machineName: String,
  model: String,
  invoiceNumber: String,
  emiStartDate: String,
  startDate: { type: String, default: () => new Date().toLocaleDateString('en-IN') },
  principal: Number,
  emi: Number,
  tenure: Number,
  interestRate: Number,
  downPayment: Number,
  machinePrice: Number,
  discountAmount: Number,
  discountPercentage: Number,
  delayInterest: { type: Number, default: 0 },
  selectedAttachments: [{
    name: String,
    amount: Number,
    isStandard: Boolean
  }],
  manualCharges: [{
    name: String,
    amount: Number
  }],
  status: { type: String, default: 'Active' },
  approvalStatus: { type: String, default: 'Pending Approval' },
  approvalHistory: [{
    action: String,
    notes: String,
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: String,
    status: String,
    date: { type: Date, default: Date.now }
  }],
  approvalStep: { type: Number, default: 0 },
  approvalFlowId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalFlow' },
  agreementGenerated: { type: Boolean, default: false },
  agreementUrl: { type: String },
  invoiceNumber: { type: String },
  invoiceData: { type: Object },
  invoiceUrl: { type: String },
  serialNumber: { type: String },
  dispatchDate: { type: String },
  dispatchData: { type: Object },
  commissionDate: { type: String },
  downPaymentInstallments: { type: Number, default: 1 },
  compoundOverdueInterest: { type: Boolean, default: false },
  interestWaiverLogs: [{
    user: String,
    date: { type: Date, default: Date.now },
    amountWaived: Number,
    reason: String,
    installmentNo: Number
  }],
  schedule: [{
    installment: Number,
    type: { type: String, enum: ['DownPayment', 'EMI'], default: 'EMI' },
    dueDate: String,
    emi: Number,
    principal: Number,
    interest: Number,
    outstandingAmount: { type: Number, default: 0 },
    overdueInterest: { type: Number, default: 0 },
    paidOverdueInterest: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paidDate: Date,
    balance: Number,
    status: { type: String, enum: ['Pending', 'Partial', 'Paid'], default: 'Pending' }
  }]
}, { timestamps: true });

export default mongoose.model('Loan', loanSchema);
