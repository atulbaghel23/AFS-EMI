import puppeteer from 'puppeteer';
import { getAgreementPages } from './agreementText.js';

const launchBrowser = async () => {
  const options = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  try {
    return await puppeteer.launch(options);
  } catch (err) {
    console.warn("Puppeteer launch failed, trying with channel 'chrome'...", err.message);
    try {
      return await puppeteer.launch({
        ...options,
        channel: 'chrome'
      });
    } catch (fallbackErr) {
      console.error("Puppeteer fallback launch also failed:", fallbackErr);
      throw fallbackErr;
    }
  }
};

export const generateReceiptPDF = async (loan, installment) => {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const index = loan.schedule.findIndex(s => s._id === installment._id || s === installment);
  const instNum = installment.installment || installment.installmentNo || (index + 1);
  const invoiceNo = `INV-${loan._id.toString().substring(loan._id.toString().length - 6).toUpperCase()}-${instNum.toString().padStart(2, '0')}`;
  const customerName = (loan.customerId?.name || 'CLIENT').toUpperCase();
  const assetName = (loan.machineName || 'Asset').toUpperCase();
  const serialNo = loan.serialNumber || 'SN-8821034';
  
  const paidBaseEmi = installment.paidAmount !== undefined ? installment.paidAmount : loan.emi;
  const paidOverdue = installment.paidOverdueInterest || 0;
  const totalPaid = paidBaseEmi + paidOverdue;

  const html = `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #f8fafc; padding: 40px; color: #1e293b; line-height: 1.5; }
        .invoice-card { background: white; max-width: 800px; margin: 0 auto; border-radius: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden; border: 1px solid #e2e8f0; }
        .header { background: #0f172a; padding: 40px; color: white; display: flex; justify-content: space-between; align-items: center; }
        .logo-side h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -1px; }
        .logo-side p { margin: 5px 0 0; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; }
        .invoice-side { text-align: right; }
        .invoice-side h2 { margin: 0; font-size: 32px; font-weight: 900; color: #f0883e; font-style: italic; }
        .invoice-side p { margin: 5px 0 0; font-size: 12px; font-weight: 600; color: #94a3b8; }
        
        .content { padding: 40px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
        .info-block h3 { margin: 0 0 10px; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
        .info-block p { margin: 0; font-size: 14px; font-weight: 700; color: #1e293b; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f1f5f9; text-align: left; padding: 15px; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
        td { padding: 15px; font-size: 14px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }
        .text-right { text-align: right; }
        
        .total-section { margin-top: 30px; display: flex; justify-content: flex-end; }
        .total-box { background: #f8fafc; padding: 20px 40px; border-radius: 16px; border: 1px solid #e2e8f0; }
        .total-row { display: flex; justify-content: space-between; gap: 40px; margin-bottom: 10px; }
        .total-row.grand { margin-top: 10px; padding-top: 10px; border-top: 2px dashed #e2e8f0; color: #0f172a; }
        .total-row span:first-child { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
        .total-row span:last-child { font-size: 16px; font-weight: 900; }
        .grand span:last-child { color: #f0883e; font-size: 24px; }
        
        .footer { padding: 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; }
        .footer p { margin: 0; font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; }
        .stamp { margin-top: 20px; font-size: 12px; font-weight: 900; color: #3fb950; border: 3px solid #3fb950; display: inline-block; padding: 5px 15px; border-radius: 8px; transform: rotate(-5deg); text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="header">
          <div class="logo-side">
            <h1>LIUGONG</h1>
            <p>Industrial Finance Division</p>
          </div>
          <div class="invoice-side">
            <h2>RECEIPT</h2>
            <p>NO: ${invoiceNo}</p>
          </div>
        </div>
        
        <div class="content">
          <div class="grid">
            <div class="info-block">
              <h3>Billed To</h3>
              <p>${customerName}</p>
              <p style="font-size: 10px; color: #64748b; margin-top: 5px;">Authorized Client Portal Access</p>
            </div>
            <div class="info-block" style="text-align: right;">
              <h3>Date of Issue</h3>
              <p>${installment.dueDate}</p>
              <h3 style="margin-top: 15px;">Status</h3>
              <p style="color: #3fb950;">FULLY SETTLED</p>
            </div>
          </div>
          
          <div class="info-block" style="margin-bottom: 30px;">
            <h3>Asset Description</h3>
            <p>${assetName} / ${serialNo}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>EMI Installment #${instNum} - ${installment.dueDate}</td>
                <td class="text-right">${formatINR(paidBaseEmi)}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 12px;">&nbsp;&nbsp;&bull; Principal Component</td>
                <td class="text-right" style="color: #64748b; font-size: 12px;">${formatINR(installment.principal)}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 12px;">&nbsp;&nbsp;&bull; Interest Component</td>
                <td class="text-right" style="color: #64748b; font-size: 12px;">${formatINR(installment.interest)}</td>
              </tr>
              ${paidOverdue > 0 ? `
              <tr>
                <td>Overdue / Delay Penalty Paid</td>
                <td class="text-right" style="color: #ef4444;">${formatINR(paidOverdue)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-box">
              <div class="total-row">
                <span>Subtotal</span>
                <span>${formatINR(totalPaid)}</span>
              </div>
              <div class="total-row">
                <span>Tax (Inclusive)</span>
                <span>₹0</span>
              </div>
              <div class="total-row grand">
                <span>Total Paid</span>
                <span>${formatINR(totalPaid)}</span>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 20px; text-align: center;">
            <div class="stamp">PAID & VERIFIED</div>
          </div>
        </div>
        
        <div class="footer">
          <p>This is a computer generated receipt and does not require a physical signature.</p>
          <p style="margin-top: 0px;">LiuGong Machinery Corp. &copy; 2024 | Finance Node: ${loan._id.toString().toUpperCase()}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });

  await browser.close();
  return pdf;
};

export const generateAgreementHTML = (loan, isForBrowserPrint = false) => {
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatExecutionDate = (dateStr) => {
    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) return '25th day of April, 2026';
    const day = date.getDate();
    const year = date.getFullYear();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = monthNames[date.getMonth()];
    
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    
    return `${day}<sup>${suffix}</sup> day of ${month}, ${year}`;
  };

  const formatDateGB = (dateStr) => {
    if (!dateStr) return 'TBD';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const customerName = (loan.customerId?.name || 'CLIENT').toUpperCase();
  const customerCompany = (loan.customerId?.company || loan.customerId?.name || 'CLIENT').toUpperCase();
  const customerAddress = loan.customerId?.address || 'ABC';
  const customerCity = loan.customerId?.city || '';
  const customerState = loan.customerId?.state || '';
  const customerPin = loan.customerId?.pin || loan.customerId?.pincode || '';
  const customerPan = loan.customerId?.pan || 'PAN-TBD';
  const customerGst = loan.customerId?.gst || 'GST-TBD';
  const contactPerson = loan.customerId?.contactPerson || 'Mohinderpal Singh Mann';

  const assetName = (loan.machineName || 'Asset').toUpperCase();
  const modelNo = (loan.model || 'Model No').toUpperCase();
  const tenure = loan.tenure || 36;
  const executionDate = formatExecutionDate(loan.startDate || loan.createdAt);
  const overduePenalty = loan.delayInterest !== undefined ? loan.delayInterest : 24;

  const attachmentTotal = (loan.selectedAttachments || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const manualChargesTotal = (loan.manualCharges || []).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const baseMachinePrice = (loan.machinePrice || 0) - (loan.discountAmount || 0) + attachmentTotal + manualChargesTotal;

  const gstRate = 0.18;
  const tcsRate = 0.001;

  const baseGst = Math.round(baseMachinePrice * gstRate * 100) / 100;
  const baseSaleValue = baseMachinePrice + baseGst;
  const baseTcs = Math.round(baseSaleValue * tcsRate * 100) / 100;
  const baseInvoiceValue = baseSaleValue + baseTcs;
  const baseFinancedAmount = Math.max(0, Math.round(baseInvoiceValue) - (loan.downPayment || 0));

  const rMonthly = ((loan.interestRate || 12) / 12) / 100;
  let interestAmount = 0;
  if (baseFinancedAmount > 0 && (loan.interestRate || 12) > 0) {
    const baseEmi = Math.round((baseFinancedAmount * rMonthly * Math.pow(1 + rMonthly, tenure)) / (Math.pow(1 + rMonthly, tenure) - 1));
    interestAmount = (baseEmi * tenure) - baseFinancedAmount;
  }

  const salePrice = Math.round(baseMachinePrice + interestAmount);
  const gst = Math.round(salePrice * gstRate);
  const saleValue = salePrice + gst;
  const tcs = Math.round(saleValue * tcsRate);
  const invoiceValue = saleValue + tcs;
  const financedAmount = Math.max(0, invoiceValue - (loan.downPayment || 0));
  const finalEmi = Math.round(financedAmount / tenure);

  const agreementPages = getAgreementPages({
    executionDate,
    customerCompany,
    customerPan,
    customerAddress,
    customerCity,
    customerState,
    customerPin,
    contactPerson,
    tenure,
    overduePenalty,
    formatINR,
    salePrice,
    gst,
    tcs,
    invoiceValue,
    financedAmount,
    finalEmi,
    downPayment: loan.downPayment || 0
  });

  const printStylesAndMenu = isForBrowserPrint ? `
    <div class="no-print">
      <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
      <button class="btn-close" onclick="window.close()">Close Window</button>
    </div>
  ` : '';

  const printScript = isForBrowserPrint ? `
    <script>
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          window.print();
        }, 500);
      });
    </script>
  ` : '';

  return `
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          line-height: 1.35;
          font-size: 11px;
          background-color: #ffffff;
          padding: 0;
          margin: 0;
        }
        .page {
          padding: 0;
          page-break-after: always;
          box-sizing: border-box;
          position: relative;
        }
        .page:last-child {
          page-break-after: avoid;
        }
        p {
          margin: 0 0 4px 0;
        }
        h1, h2, h3, h4 {
          color: #0f172a;
          font-weight: 700;
          margin-top: 0;
          text-align: center;
        }
        h1.title {
          font-size: 20px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 60px;
          margin-bottom: 20px;
        }
        h2.subtitle {
          font-size: 14px;
          text-transform: uppercase;
          margin-bottom: 30px;
        }
        .text-justify {
          text-align: justify;
        }
        .section-title {
          font-weight: bold;
          margin-top: 25px;
          margin-bottom: 8px;
          text-transform: uppercase;
          font-size: 14px;
          border-bottom: 1.5px solid #cbd5e1;
          padding-bottom: 4px;
        }
        .clause-text {
          margin-bottom: 15px;
        }
        .bullet-list {
          padding-left: 20px;
          margin-top: 5px;
          margin-bottom: 10px;
        }
        .bullet-list li {
          margin-bottom: 5px;
        }
        .financial-table, .schedule-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
          margin-bottom: 15px;
        }
        .financial-table th, .schedule-table th {
          background-color: #f8fafc;
          border: 1px solid #cbd5e1;
          padding: 10px;
          font-weight: bold;
          text-align: left;
          font-size: 12px;
        }
        .financial-table td, .schedule-table td {
          border: 1px solid #cbd5e1;
          padding: 10px;
          font-size: 12px;
        }
        .financial-table tr.total-row td {
          font-weight: bold;
          background-color: #f1f5f9;
        }
        .signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 50px;
          margin-top: 60px;
        }
        .sig-block {
          text-align: center;
        }
        .sig-line {
          border-top: 1.5px solid #0f172a;
          margin-top: 65px;
          padding-top: 10px;
          font-weight: bold;
          font-size: 13px;
        }
        
        /* Premium Floating Navigation Menu for Browser Printing */
        .no-print {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(8px);
          padding: 12px 24px;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s ease;
        }
        .no-print button {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 20px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .btn-print {
          background: #f0883e;
          color: white;
        }
        .btn-print:hover {
          background: #e0772d;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(240, 136, 62, 0.3);
        }
        .btn-close {
          background: transparent;
          color: #e2e8f0;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
        .btn-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        
        @page {
          size: A4;
          margin: 65px 50px 65px 50px;
        }
        
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page {
            page-break-after: always;
            page-break-inside: avoid;
            margin: 0;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      ${printStylesAndMenu}

      ${agreementPages.map(pageHtml => `
        <div class="page">
          ${pageHtml}
        </div>
      `).join('')}

      <!-- SCHEDULE 1 TABLE A -->
      <div class="page">
        <div style="text-align: center; font-weight: bold; font-size: 16px; text-transform: uppercase; margin-bottom: 40px; letter-spacing: 1px;">
          SCHEDULE 1<br/>
          Table - A<br/>
          DETAILS OF MACHINERY AND EQUIPMENT
        </div>
        
        <table class="schedule-table">
          <thead>
            <tr>
              <th>Machine Type</th>
              <th>Model No</th>
              <th>No of Machine</th>
              <th>Number of Instalments</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${assetName}</strong></td>
              <td><strong>${modelNo}</strong></td>
              <td>1</td>
              <td>${tenure}</td>
            </tr>
            <tr style="font-weight: bold; background-color: #f1f5f9;">
              <td colspan="2">Total</td>
              <td>1</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 120px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
            <span>FOR LIUGONG INDIA PVT. LTD.</span>
            <span>FOR ${customerCompany}</span>
          </div>
          
          <div class="signatures-grid" style="margin-top: 120px;">
            <div class="sig-block">
              <div class="sig-line">Authorised Signatory</div>
              <div style="font-size: 13px; margin-top: 8px; font-weight: bold;">Name - Nischal Mehrotra</div>
            </div>
            <div class="sig-block">
              <div class="sig-line">Partner / (Authorised Signatory)</div>
              <div style="font-size: 13px; margin-top: 8px; font-weight: bold;">Name - ${contactPerson}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- TABLE B PAYMENT SCHEDULE -->
      <div class="page" style="page-break-after: avoid !important;">
        <div style="text-align: center; font-weight: bold; font-size: 15px; text-transform: uppercase; margin-bottom: 30px; letter-spacing: 0.5px;">
          TABLE - B HIRE PURCHASE PAYMENT SCHEDULE<br/>
          For Machinery and Equipment: One (1) ${assetName} ${modelNo}
        </div>
        
        <table class="schedule-table">
          <thead>
            <tr>
              <th>Hire purchase Instalment Number</th>
              <th style="text-align: right;">Instalment Amount</th>
              <th style="text-align: center;">Due Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Initial Deposit</strong></td>
              <td style="text-align: right; font-weight: bold;">${formatINR(loan.downPayment || 0)}</td>
              <td style="text-align: center; font-weight: bold;">${formatDateGB(loan.startDate || loan.createdAt)}</td>
            </tr>
            ${loan.schedule.map((s, index) => `
              <tr>
                <td>${getOrdinal(s.installment || (index + 1))}</td>
                <td style="text-align: right;">${formatINR(s.emi)}</td>
                <td style="text-align: center;">${formatDateGB(s.dueDate)}</td>
              </tr>
            `).join('')}
            <tr style="font-weight: bold; background-color: #f1f5f9;">
              <td>Total</td>
              <td style="text-align: right; color: #f0883e; font-size: 14px;">${formatINR(invoiceValue)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 120px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
            <span>FOR LIUGONG INDIA PVT. LTD.</span>
            <span>FOR ${customerCompany}</span>
          </div>
          
          <div class="signatures-grid" style="margin-top: 120px;">
            <div class="sig-block">
              <div class="sig-line">Authorised Signatory</div>
              <div style="font-size: 13px; margin-top: 8px; font-weight: bold;">Name - Nischal Mehrotra</div>
            </div>
            <div class="sig-block">
              <div class="sig-line">Partner / (Authorised Signatory)</div>
              <div style="font-size: 13px; margin-top: 8px; font-weight: bold;">Name - ${contactPerson}</div>
            </div>
          </div>
        </div>
      </div>

      ${printScript}
    </body>
    </html>
  `;
};

export const generateAgreementPDF = async (loan) => {
  const browser = await launchBrowser();
  const page = await browser.newPage();

  const html = generateAgreementHTML(loan, false);

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pageHeights = await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('.page'));
    return divs.map((div, index) => {
      const titleEl = div.querySelector('h1, h2, .section-title, strong');
      return {
        index: index + 1,
        height: div.offsetHeight,
        title: titleEl ? titleEl.innerText.trim().replace(/\n/g, ' ').substring(0, 60) : 'No Title'
      };
    });
  });
  console.log('--- Page Heights inside Puppeteer ---');
  pageHeights.forEach(ph => {
    console.log(`Page ${ph.index} (${ph.title}): ${ph.height}px ${ph.height > 962 ? 'OVERFLOWS (> 962px)' : 'OK'}`);
  });
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '65px', right: '50px', bottom: '65px', left: '50px' },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 8px; width: 100%; text-align: center; font-family: 'Inter', sans-serif; color: #64748b; padding: 0 50px; box-sizing: border-box; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-bottom: 20px;">
        <span style="font-weight: bold;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        <span>(Agreement No.- LIPL/HP/26-27/\${loan._id.toString().slice(-4).toUpperCase()})</span>
      </div>
    `
  });

  await browser.close();
  return pdf;
};
