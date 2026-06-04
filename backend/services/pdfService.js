import puppeteer from 'puppeteer';

export const generateReceiptPDF = async (loan, installment) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const invoiceNo = `INV-${loan._id.toString().substring(loan._id.toString().length-6).toUpperCase()}-${installment.installment.toString().padStart(2, '0')}`;
  const customerName = (loan.customerId?.name || 'CLIENT').toUpperCase();
  const assetName = loan.machineName.toUpperCase();
  const serialNo = loan.serialNumber || 'SN-8821034';

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
                <td>EMI Installment #${installment.installment} - ${installment.dueDate}</td>
                <td class="text-right">${formatINR(loan.emi)}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 12px;">&nbsp;&nbsp;&bull; Principal Component</td>
                <td class="text-right" style="color: #64748b; font-size: 12px;">${formatINR(installment.principal)}</td>
              </tr>
              <tr>
                <td style="color: #64748b; font-size: 12px;">&nbsp;&nbsp;&bull; Interest Component</td>
                <td class="text-right" style="color: #64748b; font-size: 12px;">${formatINR(installment.interest)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-box">
              <div class="total-row">
                <span>Subtotal</span>
                <span>${formatINR(loan.emi)}</span>
              </div>
              <div class="total-row">
                <span>Tax (Inclusive)</span>
                <span>₹0</span>
              </div>
              <div class="total-row grand">
                <span>Total Paid</span>
                <span>${formatINR(loan.emi)}</span>
              </div>
            </div>
          </div>
          
          <div style="margin-top: 40px; text-align: center;">
            <div class="stamp">PAID & VERIFIED</div>
          </div>
        </div>
        
        <div class="footer">
          <p>This is a computer generated receipt and does not require a physical signature.</p>
          <p style="margin-top: 10px;">LiuGong Machinery Corp. &copy; 2024 | Finance Node: ${loan._id.toString().toUpperCase()}</p>
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

export const generateAgreementPDF = async (loan) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const customerName = (loan.customerId?.name || 'CLIENT').toUpperCase();
  const assetName = loan.machineName.toUpperCase();
  const endDateStr = new Date(new Date(loan.emiStartDate || Date.now()).setMonth(new Date(loan.emiStartDate || Date.now()).getMonth() + loan.tenure)).toLocaleDateString('en-IN');

  const html = `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, sans-serif; background-color: #ffffff; padding: 60px; color: #1e293b; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #f0883e; padding-bottom: 20px; }
        h1 { font-size: 28px; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 2px; }
        h2 { font-size: 18px; color: #64748b; margin: 5px 0 0; font-weight: 500; }
        .section { margin-bottom: 30px; }
        .section h3 { font-size: 16px; color: #f0883e; text-transform: uppercase; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; }
        .value { font-size: 16px; color: #0f172a; font-weight: 600; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f1f5f9; padding: 10px; font-size: 12px; color: #64748b; text-transform: uppercase; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        .signatures { margin-top: 80px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; }
        .sig-line { border-top: 1px solid #0f172a; margin-top: 60px; padding-top: 10px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>FINANCING AGREEMENT</h1>
        <h2>LiuGong Industrial Finance Division</h2>
      </div>

      <div class="section">
        <h3>1. Parties to the Agreement</h3>
        <p>This agreement is entered into between <strong>LiuGong Machinery Corp.</strong> (hereinafter referred to as the "Financier") and <strong>${customerName}</strong> (hereinafter referred to as the "Client").</p>
      </div>

      <div class="section">
        <h3>2. Financed Asset Details</h3>
        <div class="details-grid">
          <div>
            <div class="label">Asset Model</div>
            <div class="value">${assetName}</div>
          </div>
          <div>
            <div class="label">Agreement ID</div>
            <div class="value">AGR-${loan._id.toString().toUpperCase()}</div>
          </div>
        </div>
        
        <table style="margin-top: 25px;">
          <thead>
            <tr>
              <th>Valuation Component</th>
              <th style="text-align: right;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base Asset Value</td>
              <td style="text-align: right; font-weight: 600;">${formatINR(loan.machinePrice || 0)}</td>
            </tr>
            ${loan.discountAmount > 0 ? `
            <tr>
              <td>Approved Discount ${loan.discountPercentage ? `(${loan.discountPercentage.toFixed(1)}%)` : ''}</td>
              <td style="text-align: right; color: #ef4444; font-weight: 600;">- ${formatINR(loan.discountAmount)}</td>
            </tr>
            ` : ''}
            ${loan.selectedAttachments?.length > 0 ? loan.selectedAttachments.map(att => `
            <tr>
              <td>Attachment: ${att.name} ${att.isStandard ? '<span style="font-size: 10px; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">STD</span>' : ''}</td>
              <td style="text-align: right; font-weight: 600;">${att.amount === 0 && att.isStandard ? 'INCLUDED' : `+ ${formatINR(att.amount)}`}</td>
            </tr>
            `).join('') : ''}
            ${loan.manualCharges?.length > 0 ? loan.manualCharges.map(charge => `
            <tr>
              <td>Additional Charge: ${charge.name}</td>
              <td style="text-align: right; font-weight: 600;">+ ${formatINR(charge.amount)}</td>
            </tr>
            `).join('') : ''}
            <tr style="background: #f1f5f9;">
              <td style="color: #f0883e; font-weight: 900; font-size: 14px;">TOTAL FINANCED PRINCIPAL</td>
              <td style="text-align: right; color: #f0883e; font-weight: 900; font-size: 16px;">${formatINR(loan.principal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <h3>3. Financing Schedule & Terms</h3>
        <div class="details-grid">
          <div>
            <div class="label">Principal Amount</div>
            <div class="value">${formatINR(loan.principal)}</div>
          </div>
          <div>
            <div class="label">Down Payment</div>
            <div class="value">${formatINR(loan.downPayment || 0)}</div>
          </div>
          <div>
            <div class="label">Total Discount</div>
            <div class="value">${loan.discountPercentage || 0}% (${formatINR(loan.discountAmount || 0)})</div>
          </div>
          <div>
            <div class="label">Additional Charges</div>
            <div class="value">${formatINR((loan.manualCharges || []).reduce((sum, c) => sum + c.amount, 0))}</div>
          </div>
          <div>
            <div class="label">Monthly EMI</div>
            <div class="value">${formatINR(loan.emi)}</div>
          </div>
          <div>
            <div class="label">Tenure (Months)</div>
            <div class="value">${loan.tenure}</div>
          </div>
          <div>
            <div class="label">Interest Rate</div>
            <div class="value">${loan.interestRate || 0}% p.a.</div>
          </div>
          <div>
            <div class="label">Overdue Penalty</div>
            <div class="value">${loan.delayInterest !== undefined ? loan.delayInterest : 2}% / month</div>
          </div>
          <div>
            <div class="label">EMI Start Date</div>
            <div class="value">${loan.emiStartDate ? new Date(loan.emiStartDate).toLocaleDateString('en-GB') : 'TBD'}</div>
          </div>
          <div>
            <div class="label">Estimated End Date</div>
            <div class="value">${endDateStr}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>4. Repayment Schedule</h3>
        <table>
          <thead>
            <tr>
              <th>Installment #</th>
              <th>Due Date</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Total EMI</th>
            </tr>
          </thead>
          <tbody>
            ${loan.schedule.slice(0, 5).map(s => `
              <tr>
                <td>${s.installment}</td>
                <td>${s.dueDate}</td>
                <td>${formatINR(s.principal)}</td>
                <td>${formatINR(s.interest)}</td>
                <td>${formatINR(loan.emi)}</td>
              </tr>
            `).join('')}
            ${loan.schedule.length > 5 ? '<tr><td colspan="5" style="text-align: center; font-style: italic;">... remaining schedule omitted for brevity ...</td></tr>' : ''}
          </tbody>
        </table>
      </div>

      <div class="signatures">
        <div>
          <div class="sig-line">Authorized Signatory (LiuGong)</div>
        </div>
        <div>
          <div class="sig-line">Authorized Signatory (Client)</div>
          <p style="font-size: 10px; color: #64748b; margin-top: 5px;">${customerName}</p>
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
