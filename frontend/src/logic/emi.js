// src/logic/emi.js

/**
 * Calculate EMI for Flat Interest Rate
 * Formula: EMI = (Principal + (Principal * Rate * Tenure)) / (Tenure * 12)
 */
export const calculateFlatEMI = (principal, annualRate, years) => {
  const totalInterest = principal * (annualRate / 100) * years;
  const totalAmount = principal + totalInterest;
  const months = years * 12;
  return Math.round(totalAmount / months);
};

/**
 * Calculate EMI for Reducing Balance Interest Rate
 * Formula: EMI = [P * R * (1+R)^N] / [(1+R)^N - 1]
 * P = Principal, R = Monthly Rate, N = Months
 */
export const calculateReducingEMI = (principal, annualRate, years) => {
  const r = annualRate / 12 / 100;
  const n = years * 12;
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
};

/**
 * Generate Repayment Schedule
 */
export const generateSchedule = (principal, annualRate, years, type = 'reducing', startDate = new Date(), downPayment = 0, dpInstallments = 0, marginAnnualRate = 0) => {
  const schedule = [];
  const totalMonths = years * 12;
  const emiMonths = totalMonths;
  let currentInstallment = 1;

  let baseDate = new Date(startDate);
  
  // Phase 1: Down Payment Installments
  if (downPayment > 0 && dpInstallments > 0) {
    // Calculate flat interest on Margin Money over DP installment duration
    const dpInterestTotal = Math.round(downPayment * (marginAnnualRate / 100) * (dpInstallments / 12));
    const totalDpPayable = downPayment + dpInterestTotal;
    const dpEmi = Math.round(totalDpPayable / dpInstallments);
    let remainingDp = totalDpPayable;
    
    for (let i = 1; i <= dpInstallments; i++) {
      let emiPayment = dpEmi;
      if (i === dpInstallments) emiPayment = remainingDp; // Adjust last installment
      
      const interestPayment = Math.round(dpInterestTotal / dpInstallments);
      const principalPayment = emiPayment - interestPayment;
      
      remainingDp -= emiPayment;
      
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installmentNo: currentInstallment++,
        type: 'DownPayment',
        dueDate: dueDate.toISOString().split('T')[0],
        emi: emiPayment,
        interest: interestPayment,
        principal: principalPayment,
        outstandingAmount: emiPayment,
        balance: 0, // Not tracked the same way for DP
        status: 'Pending'
      });
    }
    
    // Shift EMI start date by dpInstallments months
    baseDate.setMonth(baseDate.getMonth() + dpInstallments);
  }

  // Phase 2: Regular EMI
  const remainingPrincipal = principal - downPayment;
  if (remainingPrincipal > 0) {
    let remainingBalance = remainingPrincipal;
    
    let emi;
    if (type === 'flat_upfront') {
      emi = Math.round(remainingPrincipal / emiMonths);
    } else if (type === 'reducing') {
      emi = calculateReducingEMI(remainingPrincipal, annualRate, years);
    } else {
      emi = calculateFlatEMI(remainingPrincipal, annualRate, years);
    }

    const monthlyRate = annualRate / 12 / 100;

    for (let i = 1; i <= emiMonths; i++) {
      let interestPayment, principalPayment;

      if (type === 'reducing') {
        interestPayment = Math.round(remainingBalance * monthlyRate);
        principalPayment = emi - interestPayment;
      } else if (type === 'flat_upfront') {
        interestPayment = 0;
        principalPayment = emi;
      } else {
        interestPayment = Math.round((remainingPrincipal * (annualRate / 100) * years) / emiMonths);
        principalPayment = emi - interestPayment;
      }

      remainingBalance -= principalPayment;
      
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installmentNo: currentInstallment++,
        type: 'EMI',
        dueDate: dueDate.toISOString().split('T')[0],
        emi,
        interest: interestPayment,
        principal: principalPayment,
        outstandingAmount: emi,
        balance: Math.max(0, Math.round(remainingBalance)),
        status: 'Pending'
      });
    }
  }

  return schedule;
};

