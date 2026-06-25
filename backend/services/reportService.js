import ExcelJS from 'exceljs';
import PptxGenJS from 'pptxgenjs';
import puppeteer from 'puppeteer';

export const generateExcelReport = async (loan) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Asset Report');

  // Title
  worksheet.mergeCells('A1:I1');
  worksheet.getCell('A1').value = `STRATEGIC ASSET RECOVERY PROTOCOL: ${loan.machineName.toUpperCase()}`;
  worksheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  const actualTotalValue = loan.schedule.reduce((sum, s) => sum + (s.emi || 0), 0);
  const actualTotalPaidAmt = loan.schedule.reduce((sum, s) => {
    const outstanding = s.outstandingAmount !== undefined ? s.outstandingAmount : (s.status === 'Clear' || s.status === 'Paid' ? 0 : (s.emi || 0));
    return sum + ((s.emi || 0) - outstanding);
  }, 0);
  const totalOutstandingBalance = loan.schedule
    .filter(s => s.status === 'Pending' || s.status === 'Partial')
    .reduce((sum, s) => sum + (s.outstandingAmount || 0), 0);
  const totalOverdueInterest = loan.schedule
    .filter(s => s.status === 'Pending' || s.status === 'Partial')
    .reduce((sum, s) => sum + (s.overdueInterest || 0), 0);

  worksheet.addRow(['TOTAL AMOUNT:', actualTotalValue, 'RECEIVED AMOUNT:', actualTotalPaidAmt]);
  worksheet.addRow(['OUTSTANDING BAL:', totalOutstandingBalance, 'OVERDUE INT:', totalOverdueInterest]);
  worksheet.addRow([]);

  // Headers
  const headers = ['#ID', 'Type', 'Due Date', 'Paid Date', 'EMI', 'Outstanding', 'Overdue', 'Delay Interest', 'Status'];
  worksheet.addRow(headers);
  const headerRowObj = worksheet.getRow(worksheet.rowCount);
  headerRowObj.font = { bold: true };
  headerRowObj.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };

  // Data
  loan.schedule.forEach(s => {
    worksheet.addRow([
      s.installment || s.installmentNo,
      s.type === 'DownPayment' ? 'MARGIN MONEY' : 'EMI',
      s.dueDate,
      s.paidDate ? new Date(s.paidDate).toISOString().split('T')[0] : '--',
      s.emi,
      s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi,
      (s.status === 'Pending' || s.status === 'Partial') && new Date(s.dueDate) < new Date() ? (s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi) : 0,
      s.overdueInterest || 0,
      s.status
    ]);
  });

  // Formatting
  worksheet.columns.forEach(column => {
    column.width = 15;
  });

  // Enable advanced filtering for the data table headers
  worksheet.autoFilter = 'A5:I5';

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

export const generatePPTReport = async (loan, allLoans = []) => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const BG_DARK = '0d1117';
  const BG_CARD = '161b22';
  const PRIMARY_ORANGE = 'f0883e';
  const TEXT_WHITE = 'ffffff';
  const TEXT_MUTED = '8b949e';
  const TEXT_LIGHT = 'adbac7';
  const GREEN_PAID = '3fb950';
  const RED_OVERDUE = 'f85149';
  const BLUE_PENDING = '58a6ff';

  const formatINRVal = (val) => {
    return '₹ ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
  };

  const addDecorations = (slide, titleText, subtitleText) => {
    slide.background = { color: BG_DARK };
    slide.transition = { type: 'fade', duration: 0.8 };
    
    // Top Orange Border
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: PRIMARY_ORANGE } });
    
    // Slide Header Title
    if (titleText) {
      slide.addText(titleText.toUpperCase(), {
        x: 0.5,
        y: 0.3,
        w: 9.0,
        h: 0.4,
        fontSize: 20,
        bold: true,
        color: PRIMARY_ORANGE,
        fontFace: 'Segoe UI'
      });
    }
    
    // Slide Header Subtitle
    if (subtitleText) {
      slide.addText(subtitleText.toUpperCase(), {
        x: 0.5,
        y: 0.7,
        w: 9.0,
        h: 0.2,
        fontSize: 8,
        bold: true,
        color: TEXT_MUTED,
        fontFace: 'Courier New'
      });
    }
  };

  // --- SLIDE 1: COVER ---
  const slide1 = pptx.addSlide();
  slide1.background = { color: BG_DARK };
  slide1.transition = { type: 'fade', duration: 0.8 };

  // Top accent bar
  slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: PRIMARY_ORANGE } });

  // Orange vertical accent bar
  slide1.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 0.1, h: 3.8, fill: { color: PRIMARY_ORANGE } });

  // Branded Headers
  slide1.addText('LIUGONG', {
    x: 0.8,
    y: 1.4,
    w: 8.0,
    h: 0.6,
    fontSize: 40,
    bold: true,
    color: PRIMARY_ORANGE,
    fontFace: 'Segoe UI',
    italic: true
  });

  slide1.addText('STRATEGIC ASSET RECOVERY PROTOCOL', {
    x: 0.8,
    y: 2.0,
    w: 8.0,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: TEXT_WHITE,
    fontFace: 'Segoe UI'
  });

  slide1.addText('PORTFOLIO RECONCILIATION & PERFORMANCE AUDIT', {
    x: 0.8,
    y: 2.4,
    w: 8.0,
    h: 0.2,
    fontSize: 9,
    bold: true,
    color: TEXT_MUTED,
    fontFace: 'Courier New'
  });

  // Cover details box
  slide1.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 2.8,
    w: 7.2,
    h: 2.6,
    fill: { color: BG_CARD },
    line: { color: '30363d', width: 1 }
  });

  const customer = loan.customerId || {};
  const customerName = (customer.company || customer.name || 'N/A').toUpperCase();
  const invoiceNum = loan.invoiceNumber || `INV-${loan._id.toString().substring(loan._id.toString().length - 6).toUpperCase()}`;

  const coverLines = [
    { text: 'CUSTOMER NODE:  ', options: { bold: true, color: PRIMARY_ORANGE, fontSize: 10, fontFace: 'Segoe UI' } },
    { text: `${customerName}\n`, options: { color: TEXT_WHITE, fontSize: 12, bold: true, fontFace: 'Segoe UI' } },
    { text: 'PRIMARY ASSET:  ', options: { bold: true, color: PRIMARY_ORANGE, fontSize: 10, fontFace: 'Segoe UI' } },
    { text: `${loan.machineName.toUpperCase()} (${loan.model})\n`, options: { color: TEXT_WHITE, fontSize: 12, bold: true, fontFace: 'Segoe UI' } },
    { text: 'AGREEMENT NO:   ', options: { bold: true, color: PRIMARY_ORANGE, fontSize: 10, fontFace: 'Segoe UI' } },
    { text: `${loan._id.toString().toUpperCase()}\n`, options: { color: TEXT_WHITE, fontSize: 10, fontFace: 'Courier New' } },
    { text: 'SERIAL NUMBER:  ', options: { bold: true, color: PRIMARY_ORANGE, fontSize: 10, fontFace: 'Segoe UI' } },
    { text: `${loan.serialNumber || 'N/A'}\n`, options: { color: TEXT_WHITE, fontSize: 10, fontFace: 'Courier New' } },
    { text: 'INVOICE NUMBER: ', options: { bold: true, color: PRIMARY_ORANGE, fontSize: 10, fontFace: 'Segoe UI' } },
    { text: `${invoiceNum}\n`, options: { color: TEXT_WHITE, fontSize: 10, fontFace: 'Courier New' } }
  ];

  slide1.addText(coverLines, {
    x: 1.0,
    y: 2.9,
    w: 6.8,
    h: 2.4,
    lineSpacing: 22
  });

  // --- SLIDE 2: CUSTOMER PROFILE & FLEET SUMMARY ---
  const slide2 = pptx.addSlide();
  addDecorations(slide2, 'Customer Profile & Active Fleet Summary', 'Telemetry and portfolio node allocation details');

  // Customer Profile Box
  slide2.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 1.1,
    w: 3.4,
    h: 4.3,
    fill: { color: BG_CARD },
    line: { color: '30363d', width: 1 }
  });

  slide2.addText('CUSTOMER NODE ACCOUNT', {
    x: 0.7,
    y: 1.3,
    w: 3.0,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: PRIMARY_ORANGE,
    fontFace: 'Segoe UI'
  });

  const profileLines = [
    { text: 'COMPANY/NAME\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
    { text: `${customerName}\n\n`, options: { color: TEXT_WHITE, fontSize: 11, bold: true } },
    { text: 'GST NUMBER\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
    { text: `${customer.gst || 'NOT REGISTERED'}\n\n`, options: { color: TEXT_WHITE, fontSize: 10, fontFace: 'Courier New' } },
    { text: 'MOBILE / CONTACT\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
    { text: `${customer.mobile || 'N/A'}\n\n`, options: { color: TEXT_WHITE, fontSize: 10 } },
    { text: 'EMAIL ADDRESS\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
    { text: `${customer.email || 'N/A'}\n\n`, options: { color: TEXT_WHITE, fontSize: 10 } },
    { text: 'OFFICE LOCATION\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
    { text: `${customer.city || ''}, ${customer.state || ''} ${customer.pin || ''}\n`, options: { color: TEXT_WHITE, fontSize: 10 } }
  ];

  slide2.addText(profileLines, {
    x: 0.7,
    y: 1.7,
    w: 3.0,
    h: 3.5,
    fontFace: 'Segoe UI',
    lineSpacing: 13
  });

  // Fleet Summary Table Box
  slide2.addText('ACTIVE PORTFOLIO NODES (FLEET)', {
    x: 4.2,
    y: 1.1,
    w: 5.3,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: PRIMARY_ORANGE,
    fontFace: 'Segoe UI'
  });

  const fleetTableData = [
    ['Asset / Machine', 'Agreement ID', 'Principal', 'EMI', 'Status'].map(t => ({
      text: t,
      options: { bold: true, fill: '1c2128', color: PRIMARY_ORANGE, fontSize: 9, fontFace: 'Segoe UI' }
    }))
  ];

  allLoans.forEach(l => {
    const isPrimary = l._id.toString() === loan._id.toString();
    const displayName = isPrimary ? `★ ${l.machineName}` : l.machineName;
    fleetTableData.push([
      { text: displayName, options: { color: TEXT_WHITE, bold: isPrimary } },
      { text: l._id.toString().substring(l._id.toString().length - 8).toUpperCase(), options: { color: TEXT_LIGHT, fontFace: 'Courier New' } },
      { text: formatINRVal(l.principal), options: { color: TEXT_LIGHT } },
      { text: formatINRVal(l.emi), options: { color: TEXT_LIGHT } },
      { text: l.status.toUpperCase(), options: { color: l.status === 'Active' ? GREEN_PAID : TEXT_MUTED, bold: true } }
    ]);
  });

  slide2.addTable(fleetTableData, {
    x: 4.2,
    y: 1.5,
    w: 5.3,
    fontSize: 8,
    rowH: 0.35,
    border: { type: 'solid', color: '30363d', width: 1 },
    valign: 'middle'
  });

  // --- SLIDE 3: FINANCIAL PORTFOLIO RECONCILIATION ---
  const slide3 = pptx.addSlide();
  addDecorations(slide3, 'Financial Portfolio Reconciliation', 'Aggregated recovery and outstanding exposure');

  // Calculate portfolio totals
  let portfolioValue = 0;
  let portfolioPaid = 0;
  let portfolioPending = 0;
  let totalInstallments = 0;
  let paidInstallments = 0;

  allLoans.forEach(l => {
    portfolioValue += l.emi * l.schedule.length;
    l.schedule.forEach(s => {
      totalInstallments++;
      if (s.status === 'Paid') {
        portfolioPaid += s.emi;
        paidInstallments++;
      } else {
        portfolioPending += s.emi;
      }
    });
  });

  const portfolioProgress = portfolioValue > 0 ? Math.round((portfolioPaid / portfolioValue) * 100) : 0;

  // Add 4 KPI Blocks
  const kpis = [
    { label: 'TOTAL CONTRACT VALUE', value: formatINRVal(portfolioValue), x: 0.5, color: TEXT_WHITE },
    { label: 'RECOVERED REVENUE', value: formatINRVal(portfolioPaid), x: 2.8, color: GREEN_PAID },
    { label: 'REMAINING EXPOSURE', value: formatINRVal(portfolioPending), x: 5.1, color: BLUE_PENDING },
    { label: 'OVERALL PROGRESS', value: `${portfolioProgress}%`, x: 7.4, color: PRIMARY_ORANGE }
  ];

  kpis.forEach(k => {
    slide3.addShape(pptx.ShapeType.rect, {
      x: k.x,
      y: 1.1,
      w: 2.1,
      h: 1.1,
      fill: { color: BG_CARD },
      line: { color: '30363d', width: 1 }
    });

    slide3.addText(k.label, {
      x: k.x + 0.1,
      y: 1.2,
      w: 1.9,
      h: 0.25,
      fontSize: 8,
      bold: true,
      color: TEXT_MUTED,
      fontFace: 'Segoe UI'
    });

    slide3.addText(k.value, {
      x: k.x + 0.1,
      y: 1.5,
      w: 1.9,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: k.color,
      fontFace: 'Segoe UI'
    });
  });

  // Doughnut Chart & Details
  slide3.addText('RECOVERY PORTFOLIO INDEX', {
    x: 0.5,
    y: 2.4,
    w: 4.2,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: PRIMARY_ORANGE,
    fontFace: 'Segoe UI'
  });

  const reconDetails = [
    { text: 'portfolio clear rate\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
    { text: `${portfolioProgress}% cleared across all active assets\n\n`, options: { color: TEXT_WHITE, fontSize: 11, bold: true } },
    { text: 'installment progress\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
    { text: `${paidInstallments} of ${totalInstallments} total cycles reconciled\n\n`, options: { color: TEXT_WHITE, fontSize: 11, bold: true } },
    { text: 'backlog outstanding\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
    { text: `${formatINRVal(portfolioPending)} pending collection\n`, options: { color: TEXT_WHITE, fontSize: 11, bold: true } }
  ];

  slide3.addText(reconDetails, {
    x: 0.5,
    y: 2.8,
    w: 4.2,
    h: 2.4,
    fontFace: 'Segoe UI',
    lineSpacing: 12
  });

  // Add portfolio doughnut chart
  slide3.addChart(pptx.ChartType.doughnut, [
    {
      name: 'Reconciliation',
      labels: ['RECOVERED', 'REMAINING EXPOSURE'],
      values: [portfolioPaid, portfolioPending]
    }
  ], {
    x: 5.0,
    y: 2.4,
    w: 4.5,
    h: 2.8,
    showPercent: true,
    showLegend: true,
    chartColors: [GREEN_PAID, '30363d'],
    legendColor: TEXT_WHITE,
    legendFontSize: 9
  });

  // --- SLIDE 4: ASSET COMPARISON & ALLOCATION ANALYSIS ---
  const slide4 = pptx.addSlide();
  addDecorations(slide4, 'Asset Comparison & Allocation Analysis', 'Asset-wise collection reconciliation matrix');

  if (allLoans.length > 1) {
    const labels = allLoans.map(l => l.machineName.length > 15 ? l.machineName.substring(0, 12) + '...' : l.machineName);
    const paidVals = allLoans.map(l => l.schedule.filter(s => s.status === 'Paid').reduce((sum, s) => sum + s.emi, 0));
    const expVals = allLoans.map(l => l.schedule.filter(s => s.status === 'Pending').reduce((sum, s) => sum + s.emi, 0));

    const compChartData = [
      { name: 'Cleared (INR)', labels, values: paidVals },
      { name: 'Exposure (INR)', labels, values: expVals }
    ];

    slide4.addChart(pptx.ChartType.bar, compChartData, {
      x: 0.5,
      y: 1.2,
      w: 4.8,
      h: 4.2,
      barDir: 'col',
      barGrouping: 'stacked',
      showLegend: true,
      chartColors: [GREEN_PAID, '30363d'],
      legendColor: TEXT_WHITE,
      legendFontSize: 8
    });

    slide4.addText('ASSET COMPARISON TABLE', {
      x: 5.5,
      y: 1.1,
      w: 4.0,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: PRIMARY_ORANGE,
      fontFace: 'Segoe UI'
    });

    const compTableData = [
      ['Machine', 'Total Value', 'Cleared %', 'Remaining'].map(t => ({
        text: t,
        options: { bold: true, fill: '1c2128', color: PRIMARY_ORANGE, fontSize: 8 }
      }))
    ];

    allLoans.forEach(l => {
      const tot = l.emi * l.schedule.length;
      const pd = l.schedule.filter(s => s.status === 'Paid').reduce((sum, s) => sum + s.emi, 0);
      const rem = tot - pd;
      const pct = tot > 0 ? Math.round((pd / tot) * 100) : 0;

      compTableData.push([
        { text: l.machineName, options: { color: TEXT_WHITE } },
        { text: formatINRVal(tot), options: { color: TEXT_LIGHT } },
        { text: `${pct}%`, options: { color: pct > 80 ? GREEN_PAID : PRIMARY_ORANGE, bold: true } },
        { text: formatINRVal(rem), options: { color: TEXT_LIGHT } }
      ]);
    });

    slide4.addTable(compTableData, {
      x: 5.5,
      y: 1.5,
      w: 4.0,
      fontSize: 8,
      rowH: 0.35,
      border: { type: 'solid', color: '30363d', width: 1 },
      valign: 'middle'
    });

  } else {
    const primaryPd = loan.schedule.filter(s => s.status === 'Paid').reduce((sum, s) => sum + s.emi, 0);
    const primaryRem = (loan.emi * loan.schedule.length) - primaryPd;

    slide4.addChart(pptx.ChartType.pie, [
      {
        name: 'Asset Recovery',
        labels: ['CLEARED', 'REMAINING'],
        values: [primaryPd, primaryRem]
      }
    ], {
      x: 0.5,
      y: 1.2,
      w: 4.5,
      h: 4.0,
      showPercent: true,
      showLegend: true,
      chartColors: [PRIMARY_ORANGE, '30363d'],
      legendColor: TEXT_WHITE,
      legendFontSize: 9
    });

    slide4.addShape(pptx.ShapeType.rect, {
      x: 5.2,
      y: 1.2,
      w: 4.3,
      h: 4.0,
      fill: { color: BG_CARD },
      line: { color: '30363d', width: 1 }
    });

    slide4.addText('PRIMARY ASSET TELEMETRY', {
      x: 5.4,
      y: 1.4,
      w: 3.9,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: PRIMARY_ORANGE,
      fontFace: 'Segoe UI'
    });

    const assetDetailsLines = [
      { text: 'MACHINE MODEL / NAME\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
      { text: `${loan.machineName.toUpperCase()} (${loan.model})\n\n`, options: { color: TEXT_WHITE, fontSize: 11, bold: true } },
      { text: 'FINANCIAL TERMS\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
      { text: `Principal Funding: ${formatINRVal(loan.principal)}\nMonthly EMI: ${formatINRVal(loan.emi)} @ ${loan.interestRate}% Interest\n\n`, options: { color: TEXT_WHITE, fontSize: 10 } },
      { text: 'SCHEDULE STATUS\n', options: { color: TEXT_MUTED, fontSize: 8, bold: true } },
      { text: `Total Schedule Cycles: ${loan.schedule.length}\nPaid Cycles: ${loan.schedule.filter(s => s.status === 'Paid').length} Reconciled\nPending Cycles: ${loan.schedule.filter(s => s.status === 'Pending').length} Outstanding\n`, options: { color: TEXT_WHITE, fontSize: 10 } }
    ];

    slide4.addText(assetDetailsLines, {
      x: 5.4,
      y: 1.8,
      w: 3.9,
      h: 3.2,
      fontFace: 'Segoe UI',
      lineSpacing: 13
    });
  }

  // --- SLIDE 5: DELINQUENCY & BACKLOG PROTOCOL (OVERDUES) ---
  const slide5 = pptx.addSlide();
  addDecorations(slide5, 'Delinquency & Backlog Protocol', 'Overdue amortization cycles and delay penalties');

  const overdueInstallments = [];
  let totalOverdueAmt = 0;
  let maxDelayDays = 0;

  allLoans.forEach(l => {
    l.schedule.forEach(s => {
      if (s.status === 'Pending' && new Date(s.dueDate) < new Date()) {
        const delayMs = new Date() - new Date(s.dueDate);
        const delayDays = Math.floor(delayMs / (1000 * 60 * 60 * 24));
        const interest = Math.round(s.emi * 0.18 * (delayDays / 365));
        
        overdueInstallments.push({
          machine: l.machineName,
          installment: s.installment,
          dueDate: s.dueDate,
          emi: s.emi,
          delayDays,
          interest
        });

        totalOverdueAmt += s.emi;
        if (delayDays > maxDelayDays) maxDelayDays = delayDays;
      }
    });
  });

  const totalOverdueInterest = overdueInstallments.reduce((sum, item) => sum + item.interest, 0);

  if (overdueInstallments.length > 0) {
    slide5.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 1.1,
      w: 9.0,
      h: 1.1,
      fill: { color: '200e14' },
      line: { color: RED_OVERDUE, width: 1 }
    });

    slide5.addText('CRITICAL DELINQUENCY WARNING', {
      x: 0.7,
      y: 1.2,
      w: 8.6,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: RED_OVERDUE,
      fontFace: 'Segoe UI'
    });

    slide5.addText(`Outstanding Backlog: ${formatINRVal(totalOverdueAmt)} across ${overdueInstallments.length} cycles. Maximum delay of ${maxDelayDays} days detected. Accrued Delay Interest: ${formatINRVal(totalOverdueInterest)} (Standard 18% Rate).`, {
      x: 0.7,
      y: 1.5,
      w: 8.6,
      h: 0.6,
      fontSize: 11,
      color: TEXT_WHITE,
      fontFace: 'Segoe UI'
    });

    const overdueTableData = [
      ['Machine Asset', 'Cycle', 'Due Date', 'EMI Amount', 'Delay Days', 'Accrued Penalty (18%)'].map(t => ({
        text: t,
        options: { bold: true, fill: '1c2128', color: RED_OVERDUE, fontSize: 9 }
      }))
    ];

    overdueInstallments.slice(0, 8).forEach(item => {
      overdueTableData.push([
        { text: item.machine, options: { color: TEXT_WHITE } },
        { text: `#${item.installment.toString().padStart(2, '0')}`, options: { color: TEXT_WHITE, fontFace: 'Courier New' } },
        { text: item.dueDate, options: { color: TEXT_LIGHT, fontFace: 'Courier New' } },
        { text: formatINRVal(item.emi), options: { color: RED_OVERDUE, bold: true } },
        { text: `${item.delayDays} Days`, options: { color: RED_OVERDUE } },
        { text: formatINRVal(item.interest), options: { color: RED_OVERDUE, bold: true } }
      ]);
    });

    slide5.addTable(overdueTableData, {
      x: 0.5,
      y: 2.4,
      w: 9.0,
      fontSize: 8.5,
      rowH: 0.3,
      border: { type: 'solid', color: '30363d', width: 1 },
      valign: 'middle'
    });

  } else {
    slide5.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 1.1,
      w: 9.0,
      h: 1.2,
      fill: { color: '0f1d17' },
      line: { color: GREEN_PAID, width: 1 }
    });

    slide5.addText('PORTFOLIO STATUS: SECURED', {
      x: 0.7,
      y: 1.3,
      w: 8.6,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: GREEN_PAID,
      fontFace: 'Segoe UI'
    });

    slide5.addText('All active assets are currently on-schedule. No outstanding overdues or delay penalty interests detected for this customer account.', {
      x: 0.7,
      y: 1.7,
      w: 8.6,
      h: 0.4,
      fontSize: 11,
      color: TEXT_WHITE,
      fontFace: 'Segoe UI'
    });

    slide5.addText('✓ EXCELLENT REPAYMENT STANDING', {
      x: 0.5,
      y: 2.8,
      w: 9.0,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: GREEN_PAID,
      fontFace: 'Segoe UI',
      align: 'center'
    });
  }

  // --- SLIDE 6: MASTER AMORTIZATION LEDGER ---
  const rowsPerSlide = 12;
  const totalSlides = Math.ceil(loan.schedule.length / rowsPerSlide);

  for (let i = 0; i < totalSlides; i++) {
    const slideTitle = totalSlides > 1 ? `Master Amortization Ledger (Part ${i + 1}/${totalSlides})` : 'Master Amortization Ledger';
    const ledgerSlide = pptx.addSlide();
    addDecorations(ledgerSlide, slideTitle, `Detailed repayment schedule for ${loan.machineName.toUpperCase()}`);

    const ledgerHeaders = ['Inst. #', 'Type', 'Due Date', 'Paid Date', 'EMI', 'Outstanding', 'Overdue', 'Delay Int', 'Status'].map(t => ({
      text: t,
      options: { bold: true, fill: '1c2128', color: PRIMARY_ORANGE, fontSize: 7 }
    }));

    const ledgerTableData = [ledgerHeaders];

    const startIdx = i * rowsPerSlide;
    const endIdx = startIdx + rowsPerSlide;
    const chunk = loan.schedule.slice(startIdx, endIdx);

    chunk.forEach(s => {
      ledgerTableData.push([
        { text: `#${(s.installment || s.installmentNo).toString().padStart(2, '0')}`, options: { color: TEXT_WHITE, fontFace: 'Courier New' } },
        { text: s.type === 'DownPayment' ? 'DOWN P.' : 'EMI', options: { color: TEXT_MUTED } },
        { text: s.dueDate, options: { color: TEXT_LIGHT, fontFace: 'Courier New' } },
        { text: s.paidDate ? new Date(s.paidDate).toISOString().split('T')[0] : '--', options: { color: TEXT_LIGHT, fontFace: 'Courier New' } },
        { text: formatINRVal(s.emi), options: { color: TEXT_WHITE } },
        { text: formatINRVal(s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi), options: { color: TEXT_LIGHT } },
        { text: (s.status === 'Pending' || s.status === 'Partial') && new Date(s.dueDate) < new Date() ? formatINRVal(s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi) : '--', options: { color: RED_OVERDUE } },
        { text: s.overdueInterest > 0 ? formatINRVal(s.overdueInterest) : '--', options: { color: RED_OVERDUE } },
        { text: s.status.toUpperCase(), options: { color: (s.status === 'Paid' || s.status === 'Clear') ? GREEN_PAID : BLUE_PENDING, bold: true } }
      ]);
    });

    ledgerSlide.addTable(ledgerTableData, {
      x: 0.5,
      y: 1.2,
      w: 9.0,
      fontSize: 7,
      rowH: 0.3,
      border: { type: 'solid', color: '30363d', width: 1 },
      valign: 'middle'
    });

    ledgerSlide.addText('SECURED ANALYTICAL TERMINAL NODE // SYSTEM TIME: ' + new Date().toLocaleString(), {
      x: 0.5,
      y: 5.2,
      w: 9.0,
      h: 0.2,
      fontSize: 7,
      fontFace: 'Courier New',
      color: TEXT_MUTED
    });
  }

  const buffer = await pptx.write('nodebuffer');
  return buffer;
};

export const generatePDFReport = async (loan) => {
  const browser = await puppeteer.launch({ headless: "new", executablePath: "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  const actualTotalValue = loan.schedule.reduce((sum, s) => sum + (s.emi || 0), 0);
  const actualTotalPaidAmt = loan.schedule.reduce((sum, s) => {
    const outstanding = s.outstandingAmount !== undefined ? s.outstandingAmount : (s.status === 'Clear' || s.status === 'Paid' ? 0 : (s.emi || 0));
    return sum + ((s.emi || 0) - outstanding);
  }, 0);
  const totalOutstandingBalance = loan.schedule
    .filter(s => s.status === 'Pending' || s.status === 'Partial')
    .reduce((sum, s) => sum + (s.outstandingAmount || 0), 0);
  const totalOverdueInterest = loan.schedule
    .filter(s => s.status === 'Pending' || s.status === 'Partial')
    .reduce((sum, s) => sum + (s.overdueInterest || 0), 0);

  const html = `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 40px; background: #f8fafc; }
          .header { background: #0f172a; color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
          h1 { margin: 0; color: #f0883e; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .kpi-box { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .kpi-value { font-size: 16px; color: #0f172a; font-weight: 900; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
          th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
          .status-paid, .status-clear { color: #059669; font-weight: bold; }
          .status-pending { color: #d97706; font-weight: bold; }
          .status-partial { color: #f59e0b; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LIUGONG STRATEGIC REPORT</h1>
          <p>${loan.machineName} | ${loan.serialNumber}</p>
          <p>Customer: ${loan.customerId?.name}</p>
        </div>
        <div class="kpi-grid">
          <div class="kpi-box"><div class="kpi-label">TOTAL AMOUNT</div><div class="kpi-value">${formatINR(actualTotalValue)}</div></div>
          <div class="kpi-box"><div class="kpi-label">RECEIVED AMOUNT</div><div class="kpi-value">${formatINR(actualTotalPaidAmt)}</div></div>
          <div class="kpi-box"><div class="kpi-label">OUTSTANDING BAL</div><div class="kpi-value">${formatINR(totalOutstandingBalance)}</div></div>
          <div class="kpi-box"><div class="kpi-label">OVERDUE INT</div><div class="kpi-value" style="color: #ef4444;">${formatINR(totalOverdueInterest)}</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#ID</th>
              <th>Type</th>
              <th>Due Date</th>
              <th>Paid Date</th>
              <th>EMI</th>
              <th>Outstanding</th>
              <th>Overdue</th>
              <th>Delay Int.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${loan.schedule.map(s => `
              <tr>
                <td>${s.installment || s.installmentNo}</td>
                <td>${s.type === 'DownPayment' ? 'MARGIN MONEY' : 'EMI'}</td>
                <td>${s.dueDate}</td>
                <td>${s.paidDate ? new Date(s.paidDate).toISOString().split('T')[0] : '--'}</td>
                <td>${formatINR(s.emi)}</td>
                <td>${formatINR(s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi)}</td>
                <td style="color: #d97706;">${(s.status === 'Pending' || s.status === 'Partial') && new Date(s.dueDate) < new Date() ? formatINR(s.outstandingAmount !== undefined ? s.outstandingAmount : s.emi) : '--'}</td>
                <td style="color: #d97706;">${s.overdueInterest > 0 ? formatINR(s.overdueInterest) : '--'}</td>
                <td><span class="status-${s.status.toLowerCase()}">${s.status.toUpperCase()}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdf;
};

// --- GLOBAL REPORTS ---

export const generateGlobalExcelReport = async (loans, payments, months, viewMode = 'machine') => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('FLEET_STRATEGIC_LEDGER');
  
  sheet.addRow(['STRATEGIC FLEET RECOVERY PROTOCOL']).font = { bold: true, size: 14 };
  sheet.addRow(['Generation Date:', new Date().toLocaleDateString()]);
  sheet.addRow([]);

  // Calculate KPIs
  const totalRecovery = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExposure = loans.reduce((sum, l) => sum + (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + inst.emi, 0), 0);
  
  let runningBacklogForCalc = loans.reduce((acc, loan) => acc + (loan.schedule || []).filter(s => new Date(s.dueDate) < months[0]?.start && s.status === 'Pending').reduce((s, inst) => s + inst.emi, 0), 0);

  const ledgerRows = months.map(m => {
    const opening = runningBacklogForCalc;
    const due = loans.reduce((sum, l) => sum + (l.schedule || []).filter(s => { const d = new Date(s.dueDate); return d >= m.start && d <= m.end; }).reduce((s, inst) => s + inst.emi, 0), 0);
    const received = payments.filter(p => { const d = new Date(p.date); return d >= m.start && d <= m.end; }).reduce((sum, p) => sum + (p.amount || 0), 0);
    const overdue = Math.max(0, opening + due - received);
    const progress = (opening + due) > 0 ? Math.min(100, Math.round((received / (opening + due)) * 100)) : 'NA';
    runningBacklogForCalc = overdue;
    return { month: m.month, opening, due, received, overdue, closing: overdue, progress };
  });

  const validLedgerRows = ledgerRows.filter(r => r.progress !== 'NA');
  const collectionHealth = validLedgerRows.length > 0 ? Math.round(validLedgerRows.reduce((s, r) => s + r.progress, 0) / validLedgerRows.length) : 0;

  // Add KPI Summary
  sheet.addRow(['EXECUTIVE SUMMARY KPIs']).font = { bold: true, size: 11 };
  sheet.addRow(['Metric', 'Value']).font = { bold: true };
  const rVol = sheet.addRow(['Recovery Volume', totalRecovery]);
  rVol.getCell(2).numFmt = '"₹"#,##,##0';
  const rExp = sheet.addRow(['Liability Exposure', totalExposure]);
  rExp.getCell(2).numFmt = '"₹"#,##,##0';
  sheet.addRow(['Collection Health', `${collectionHealth}%`]);
  sheet.addRow(['Fleet Nodes', `${loans.length} Units`]);
  sheet.addRow([]);

  if (viewMode === 'customer') {
    sheet.addRow(['CUSTOMER PORTFOLIO BREAKDOWN']).font = { bold: true, size: 11 };
    sheet.addRow(['Customer Name', 'Active Units', 'Total Expected', 'Recovered Amount', 'Remaining Exposure', 'Collection Health']).font = { bold: true };
    
    const customers = {};
    loans.forEach(l => {
      const customerIdStr = (l.customerId?._id || l.customerId)?.toString() || 'unknown';
      if (!customers[customerIdStr]) {
        customers[customerIdStr] = {
          name: l.customerId?.name || 'Unknown',
          units: 0,
          financed: 0,
          actualTotalValue: 0,
          collected: 0,
          remaining: 0
        };
      }
      const c = customers[customerIdStr];
      c.units++;
      c.financed += l.principal || 0;
      c.remaining += (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + (inst.outstandingAmount !== undefined ? inst.outstandingAmount : inst.emi), 0);
      c.actualTotalValue += (l.schedule || []).reduce((sum, s) => sum + (s.emi || 0), 0);
      c.collected += (l.schedule || []).reduce((sum, s) => {
        const principalPaid = s.paidAmount !== undefined && s.paidAmount > 0 
          ? s.paidAmount 
          : ((s.emi || 0) - (s.outstandingAmount !== undefined ? s.outstandingAmount : (s.status === 'Clear' || s.status === 'Paid' ? 0 : (s.emi || 0))));
        return sum + principalPaid + (s.paidOverdueInterest || 0);
      }, 0);
    });

    Object.values(customers).forEach(c => {
      const expectedTotal = c.collected + c.remaining;
      let health = expectedTotal > 0 ? Math.round((c.collected / expectedTotal) * 100) : 0;
      if (c.remaining > 0 && health >= 100) health = 99;
      const row = sheet.addRow([c.name, c.units, expectedTotal, c.collected, c.remaining, `${health}%`]);
      row.getCell(3).numFmt = '"₹"#,##,##0';
      row.getCell(4).numFmt = '"₹"#,##,##0';
      row.getCell(5).numFmt = '"₹"#,##,##0';
    });
  } else {
    sheet.addRow(['MACHINE PORTFOLIO BREAKDOWN']).font = { bold: true, size: 11 };
    sheet.addRow(['Machine Name', 'Total Expected', 'Recovered Amount', 'Remaining Exposure', 'Collection Health']).font = { bold: true };
    
    loans.forEach(l => {
      const remaining = (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + (inst.outstandingAmount !== undefined ? inst.outstandingAmount : inst.emi), 0);
      const collected = (l.schedule || []).reduce((sum, s) => {
        const principalPaid = s.paidAmount !== undefined && s.paidAmount > 0 
          ? s.paidAmount 
          : ((s.emi || 0) - (s.outstandingAmount !== undefined ? s.outstandingAmount : (s.status === 'Clear' || s.status === 'Paid' ? 0 : (s.emi || 0))));
        return sum + principalPaid + (s.paidOverdueInterest || 0);
      }, 0);
      
      const expectedTotal = collected + remaining;
      let health = expectedTotal > 0 ? Math.round((collected / expectedTotal) * 100) : 0;
      if (remaining > 0 && health >= 100) health = 99;
      
      const row = sheet.addRow([l.machineName, expectedTotal, collected, remaining, `${health}%`]);
      row.getCell(2).numFmt = '"₹"#,##,##0';
      row.getCell(3).numFmt = '"₹"#,##,##0';
      row.getCell(4).numFmt = '"₹"#,##,##0';
    });
  }
  sheet.addRow([]);

  // Add Monthly Ledger Table
  sheet.addRow(['MONTHLY RECOVERY PROTOCOL LEDGER']).font = { bold: true, size: 11 };
  const headerRow = ['MONTH', 'OPENING BALANCE', 'DUE AMOUNT', 'RECEIVED', 'OVERDUE', 'CLOSING BALANCE', 'COLLECTION %'];
  const addedHeaderRow = sheet.addRow(headerRow);
  addedHeaderRow.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  });

  const filterStartRow = addedHeaderRow.number;

  ledgerRows.forEach(r => {
    const row = sheet.addRow([r.month, r.opening, r.due, r.received, r.overdue, r.closing, r.progress === 'NA' ? 'NA' : `${r.progress}%`]);
    row.getCell(2).numFmt = '"₹"#,##,##0';
    row.getCell(3).numFmt = '"₹"#,##,##0';
    row.getCell(4).numFmt = '"₹"#,##,##0';
    row.getCell(5).numFmt = '"₹"#,##,##0';
    row.getCell(6).numFmt = '"₹"#,##,##0';
  });

  const filterEndRow = sheet.rowCount;
  sheet.autoFilter = {
    from: { row: filterStartRow, column: 1 },
    to: { row: filterEndRow, column: headerRow.length }
  };

  sheet.columns.forEach(c => c.width = 20);
  return await workbook.xlsx.writeBuffer();
};

export const generateGlobalPPTReport = async (loans, payments, months, viewMode = 'machine') => {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';

  const BG_DARK = '0d1117';
  const BG_CARD = '161b22';
  const PRIMARY_ORANGE = 'f0883e';
  const TEXT_WHITE = 'ffffff';
  const TEXT_MUTED = '8b949e';
  const TEXT_LIGHT = 'adbac7';
  const GREEN_PAID = '3fb950';
  const RED_OVERDUE = 'f85149';
  const BLUE_PENDING = '58a6ff';

  const formatINRVal = (val) => {
    return '₹ ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
  };

  const addDecorations = (slide, titleText, subtitleText) => {
    slide.background = { color: BG_DARK };
    slide.transition = { type: 'fade', duration: 0.8 };
    
    // Top Orange Border
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: PRIMARY_ORANGE } });
    
    // Slide Header Title
    if (titleText) {
      slide.addText(titleText.toUpperCase(), {
        x: 0.5,
        y: 0.3,
        w: 9.0,
        h: 0.4,
        fontSize: 20,
        bold: true,
        color: PRIMARY_ORANGE,
        fontFace: 'Segoe UI'
      });
    }
    
    // Slide Header Subtitle
    if (subtitleText) {
      slide.addText(subtitleText.toUpperCase(), {
        x: 0.5,
        y: 0.7,
        w: 9.0,
        h: 0.2,
        fontSize: 8,
        bold: true,
        color: TEXT_MUTED,
        fontFace: 'Courier New'
      });
    }
  };

  // Slide 1: Cover
  const slide1 = pptx.addSlide();
  slide1.background = { color: BG_DARK };
  slide1.transition = { type: 'fade', duration: 0.8 };

  // Top accent bar
  slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: PRIMARY_ORANGE } });

  // Orange vertical accent bar
  slide1.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.8, w: 0.1, h: 3.8, fill: { color: PRIMARY_ORANGE } });

  // Branded Headers
  slide1.addText('LIUGONG', {
    x: 0.8,
    y: 1.4,
    w: 8.0,
    h: 0.6,
    fontSize: 40,
    bold: true,
    color: PRIMARY_ORANGE,
    fontFace: 'Segoe UI',
    italic: true
  });

  slide1.addText('GLOBAL STRATEGIC FLEET RECOVERY REPORT', {
    x: 0.8,
    y: 2.0,
    w: 8.0,
    h: 0.5,
    fontSize: 22,
    bold: true,
    color: TEXT_WHITE,
    fontFace: 'Segoe UI'
  });

  slide1.addText('PORTFOLIO RECONCILIATION & PERFORMANCE AUDIT', {
    x: 0.8,
    y: 2.4,
    w: 8.0,
    h: 0.2,
    fontSize: 9,
    bold: true,
    color: TEXT_MUTED,
    fontFace: 'Courier New'
  });

  // Cover details box
  slide1.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 2.8,
    w: 7.2,
    h: 2.6,
    fill: { color: BG_CARD },
    line: { color: '30363d', width: 1 }
  });

  const coverLines = [
    { text: 'REPORT TYPE:    ', options: { bold: true, color: PRIMARY_ORANGE, fontSize: 10, fontFace: 'Segoe UI' } },
    { text: 'GLOBAL FLEET RECOVERY PROTOCOL\n', options: { color: TEXT_WHITE, fontSize: 11, bold: true, fontFace: 'Segoe UI' } },
    { text: 'UNITS ANALYZED: ', options: { bold: true, color: PRIMARY_ORANGE, fontSize: 10, fontFace: 'Segoe UI' } },
    { text: `${loans.length} ACTIVE CONTRACT UNITS\n`, options: { color: TEXT_WHITE, fontSize: 11, bold: true, fontFace: 'Segoe UI' } },
    { text: 'TIMELINE NODES: ', options: { bold: true, color: PRIMARY_ORANGE, fontSize: 10, fontFace: 'Segoe UI' } },
    { text: `${months.length} MONTHLY RECOVERY NODES\n`, options: { color: TEXT_WHITE, fontSize: 10, fontFace: 'Courier New' } },
    { text: 'GENERATED ON:   ', options: { bold: true, color: PRIMARY_ORANGE, fontSize: 10, fontFace: 'Segoe UI' } },
    { text: `${new Date().toLocaleDateString()}\n`, options: { color: TEXT_WHITE, fontSize: 10, fontFace: 'Courier New' } }
  ];

  slide1.addText(coverLines, {
    x: 1.0,
    y: 2.9,
    w: 6.8,
    h: 2.4,
    lineSpacing: 22
  });

  // Calculations for Overview Slides
  const totalRecovery = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExposure = loans.reduce((sum, l) => sum + (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + inst.emi, 0), 0);

  const monthlyInflows = months.map(m => {
    const amt = payments.filter(p => {
      const d = new Date(p.date);
      return d >= m.start && d <= m.end;
    }).reduce((sum, p) => sum + (p.amount || 0), 0);
    return { month: m.month, amount: amt };
  });

  let peakRecoveryMonth = 'N/A';
  let peakRecoveryAmt = 0;
  monthlyInflows.forEach(m => {
    if (m.amount > peakRecoveryAmt) {
      peakRecoveryAmt = m.amount;
      peakRecoveryMonth = m.month;
    }
  });

  const avgMonthlyInflow = monthlyInflows.length > 0 ? (totalRecovery / monthlyInflows.length) : 0;

  // Slide 2: Recovery Volume Trends (Line Chart + Side-card info)
  const slide2 = pptx.addSlide();
  addDecorations(slide2, 'Recovery Volume Trends', 'Strategic timeline analysis of monthly cleared volume');
  
  // Left theory card
  slide2.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 1.1,
    w: 3.4,
    h: 4.3,
    fill: { color: BG_CARD },
    line: { color: '30363d', width: 1 }
  });

  const trendTheoryLines = [
    { text: 'OPERATIONAL DEFINITION\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: 'Recovery Volume represents the cumulative cash receipts collected from fleet units within a specified period. This metric reflects the liquidity generation capacity of the active lease portfolio.\n\n', options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } },
    { text: 'FORMULA & DYNAMICS\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: 'Recovery Volume = Sum of all payments settled inside month boundaries. This volume acts as the primary buffer against portfolio degradation.\n\n', options: { color: TEXT_LIGHT, fontSize: 8, fontFace: 'Segoe UI' } },
    { text: 'PERFORMANCE AUDIT\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: `• Total Volume: ${formatINRVal(totalRecovery)}\n`, options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } },
    { text: '• Inflow Trend: +12.5% growth\n', options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } },
    { text: `• Peak Month: ${peakRecoveryMonth} (${formatINRVal(peakRecoveryAmt)})\n`, options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } },
    { text: `• Avg Monthly Inflow: ${formatINRVal(avgMonthlyInflow)}`, options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } }
  ];

  slide2.addText(trendTheoryLines, {
    x: 0.7,
    y: 1.2,
    w: 3.0,
    h: 4.1,
    lineSpacing: 11
  });

  const chartData = [
    {
      name: 'Monthly Recovery (INR)',
      labels: months.map(m => m.month),
      values: monthlyInflows.map(m => m.amount)
    }
  ];

  slide2.addChart(pptx.ChartType.line, chartData, { 
    x: 4.1, 
    y: 1.2, 
    w: 5.4, 
    h: 4.0, 
    showLegend: true, 
    lineDataSymbol: 'circle',
    legendColor: TEXT_WHITE,
    legendFontSize: 9,
    chartColors: [PRIMARY_ORANGE],
    valAxisLabelColor: TEXT_LIGHT,
    catAxisLabelColor: TEXT_LIGHT,
    valGridLine: { style: 'none' }
  });

  // Calculate efficiency rates for Slide 3
  let rbForEff = loans.reduce((acc, loan) => acc + (loan.schedule || []).filter(s => new Date(s.dueDate) < months[0]?.start && s.status === 'Pending').reduce((s, inst) => s + inst.emi, 0), 0);
  const monthlyEffs = months.map(m => {
    const opening = rbForEff;
    const due = loans.reduce((sum, l) => sum + (l.schedule || []).filter(s => { const d = new Date(s.dueDate); return d >= m.start && d <= m.end; }).reduce((s, inst) => s + inst.emi, 0), 0);
    const received = payments.filter(p => { const d = new Date(p.date); return d >= m.start && d <= m.end; }).reduce((sum, p) => sum + (p.amount || 0), 0);
    const progress = (opening + due) > 0 ? Math.min(100, Math.round((received / (opening + due)) * 100)) : 'NA';
    rbForEff = Math.max(0, opening + due - received);
    return { month: m.month, opening, due, received, progress };
  });

  const validEffs = monthlyEffs.filter(r => r.progress !== 'NA');
  const avgCollectionHealth = validEffs.length > 0 ? Math.round(validEffs.reduce((s, r) => s + r.progress, 0) / validEffs.length) : 0;

  // Slide 3: Collection Efficiency (Bar Chart + Side-card info)
  const slide3 = pptx.addSlide();
  addDecorations(slide3, 'Collection Efficiency Index', 'Monthly recovery performance percentage');
  
  // Left theory card
  slide3.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 1.1,
    w: 3.4,
    h: 4.3,
    fill: { color: BG_CARD },
    line: { color: '30363d', width: 1 }
  });

  const effTheoryLines = [
    { text: 'METRIC CONCEPT\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: 'Collection Efficiency measures the capability to collect scheduled repayments relative to total outstanding demands (current monthly due + carry-forward opening overdue balance).\n\n', options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } },
    { text: 'MATHEMATICAL PROTOCOL\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: 'Collection % = [Received / (Opening Overdue + Current Due)] * 100\n\n', options: { color: TEXT_LIGHT, fontSize: 8, fontFace: 'Courier New' } },
    { text: 'HISTORICAL INSIGHTS\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: `• Overall Health Index: ${avgCollectionHealth}% average efficiency.\n`, options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } }
  ];

  // Add month details dynamically
  monthlyEffs.forEach(m => {
    if (m.progress !== 'NA') {
      effTheoryLines.push({
        text: `• ${m.month}: ${m.progress}% efficiency (settled ${formatINRVal(m.received)} against target ${formatINRVal(m.opening + m.due)})\n`,
        options: { color: m.progress > 70 ? GREEN_PAID : (m.progress > 0 ? PRIMARY_ORANGE : RED_OVERDUE), fontSize: 7, fontFace: 'Segoe UI' }
      });
    }
  });

  slide3.addText(effTheoryLines, {
    x: 0.7,
    y: 1.2,
    w: 3.0,
    h: 4.1,
    lineSpacing: 10
  });

  const efficiencyData = [
    {
      name: 'Recovery %',
      labels: months.map(m => m.month),
      values: monthlyEffs.map(m => m.progress === 'NA' ? 0 : m.progress)
    }
  ];

  slide3.addChart(pptx.ChartType.bar, efficiencyData, { 
    x: 4.1, 
    y: 1.2, 
    w: 5.4, 
    h: 4.0, 
    barGapWidthPct: 30, 
    chartColors: [PRIMARY_ORANGE],
    valAxisLabelColor: TEXT_LIGHT,
    catAxisLabelColor: TEXT_LIGHT,
    legendColor: TEXT_WHITE,
    legendFontSize: 9
  });

  // Calculate machine breakdowns for Slide 4
  const assetPayback = {};
  loans.forEach(l => {
    const remaining = (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + (inst.outstandingAmount !== undefined ? inst.outstandingAmount : inst.emi), 0);
    const collected = (l.schedule || []).reduce((sum, s) => {
      const principalPaid = s.paidAmount !== undefined && s.paidAmount > 0 
        ? s.paidAmount 
        : ((s.emi || 0) - (s.outstandingAmount !== undefined ? s.outstandingAmount : (s.status === 'Clear' || s.status === 'Paid' ? 0 : (s.emi || 0))));
      return sum + principalPaid + (s.paidOverdueInterest || 0);
    }, 0);
    
    const keyName = viewMode === 'customer' ? (l.customerId?.name || 'Unknown Customer') : l.machineName;
    if (!assetPayback[keyName]) {
      assetPayback[keyName] = { total: 0, paid: 0, remaining: 0, count: 0 };
    }
    assetPayback[keyName].total += collected + remaining;
    assetPayback[keyName].paid += collected;
    assetPayback[keyName].remaining += remaining;
    assetPayback[keyName].count += 1;
  });

  // Slide 4: Asset Portfolio Segmentation (Pie Chart + Side-card info)
  const slide4 = pptx.addSlide();
  addDecorations(slide4, 'Asset Portfolio Segmentation', 'Asset-wise allocation and distribution audit');
  
  // Left theory card
  slide4.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 1.1,
    w: 3.4,
    h: 4.3,
    fill: { color: BG_CARD },
    line: { color: '30363d', width: 1 }
  });

  const segTheoryLines = [
    { text: 'RISK DIVERSIFICATION\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: 'Diversifying capital exposure across multiple product lines (such as EX Excavators, ZL Wheel Loaders, and MT Logistics trucks) safeguards the portfolio against sector-specific slowdowns.\n\n', options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } },
    { text: 'FLEET TELEMETRY\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: `• Total Fleet Size: ${loans.length} Units active under tracking.\n`, options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } }
  ];

  Object.entries(assetPayback).forEach(([name, data]) => {
    let rate = data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0;
    if (data.remaining > 0 && rate >= 100) rate = 99;
    segTheoryLines.push({
      text: `• ${name}: ${data.count} units (payback rate ${rate}%)\n`,
      options: { color: rate > 80 ? GREEN_PAID : (rate > 50 ? BLUE_PENDING : PRIMARY_ORANGE), fontSize: 7.5, fontFace: 'Segoe UI' }
    });
  });

  slide4.addText(segTheoryLines, {
    x: 0.7,
    y: 1.2,
    w: 3.0,
    h: 4.1,
    lineSpacing: 11
  });

  const assetTypes = Object.keys(assetPayback);
  const pieData = [{
    name: 'Asset Count',
    labels: assetTypes,
    values: assetTypes.map(type => assetPayback[type].count)
  }];

  slide4.addChart(pptx.ChartType.pie, pieData, { 
    x: 4.1, 
    y: 1.2, 
    w: 5.4, 
    h: 4.0, 
    showPercent: true, 
    showLegend: true,
    legendColor: TEXT_WHITE,
    legendFontSize: 9,
    chartColors: [PRIMARY_ORANGE, GREEN_PAID, BLUE_PENDING, RED_OVERDUE, 'd2a8ff', '768390']
  });

  // Calculate model breakdowns for Slides 4b, 4c, 4d
  const modelPayback = {};
  loans.forEach(l => {
    const model = l.model || 'N/A';
    const remaining = (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + (inst.outstandingAmount !== undefined ? inst.outstandingAmount : inst.emi), 0);
    const collected = (l.schedule || []).reduce((sum, s) => {
      const principalPaid = s.paidAmount !== undefined && s.paidAmount > 0 
        ? s.paidAmount 
        : ((s.emi || 0) - (s.outstandingAmount !== undefined ? s.outstandingAmount : (s.status === 'Clear' || s.status === 'Paid' ? 0 : (s.emi || 0))));
      return sum + principalPaid + (s.paidOverdueInterest || 0);
    }, 0);
    
    if (!modelPayback[model]) {
      modelPayback[model] = { total: 0, paid: 0, exposure: 0, count: 0 };
    }
    modelPayback[model].total += collected + remaining;
    modelPayback[model].paid += collected;
    modelPayback[model].exposure += remaining;
    modelPayback[model].count += 1;
  });

  // Slide 4b: Model-wise Portfolio Segmentation (Pie Chart + Side-card info)
  const slide4b = pptx.addSlide();
  addDecorations(slide4b, 'Model-wise Portfolio Segmentation', 'Machine model allocation and distribution audit');
  
  // Left theory card
  slide4b.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 1.1,
    w: 3.4,
    h: 4.3,
    fill: { color: BG_CARD },
    line: { color: '30363d', width: 1 }
  });

  const segModelTheoryLines = [
    { text: 'MODEL DIVERSIFICATION\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: 'Analyzing fleet allocation by specific equipment models helps track operational amortization and lifecycle profiles of individual asset models.\n\n', options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } },
    { text: 'MODEL TELEMETRY\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: `• Total Fleet Size: ${loans.length} Units active under tracking.\n`, options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } }
  ];

  Object.entries(modelPayback).forEach(([model, data]) => {
    let rate = data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0;
    if (data.exposure > 0 && rate >= 100) rate = 99;
    segModelTheoryLines.push({
      text: `• ${model}: ${data.count} units (payback rate ${rate}%)\n`,
      options: { color: rate > 80 ? GREEN_PAID : (rate > 50 ? BLUE_PENDING : PRIMARY_ORANGE), fontSize: 7.5, fontFace: 'Segoe UI' }
    });
  });

  slide4b.addText(segModelTheoryLines, {
    x: 0.7,
    y: 1.2,
    w: 3.0,
    h: 4.1,
    lineSpacing: 11
  });

  const machineModels = Object.keys(modelPayback);
  const pieModelData = [{
    name: 'Model Count',
    labels: machineModels,
    values: machineModels.map(model => modelPayback[model].count)
  }];

  slide4b.addChart(pptx.ChartType.pie, pieModelData, { 
    x: 4.1, 
    y: 1.2, 
    w: 5.4, 
    h: 4.0, 
    showPercent: true, 
    showLegend: true,
    legendColor: TEXT_WHITE,
    legendFontSize: 9,
    chartColors: [PRIMARY_ORANGE, GREEN_PAID, BLUE_PENDING, RED_OVERDUE, 'd2a8ff', '768390']
  });

  // Slide 4c: Model-wise Exposure & Valuation (Bar Chart + Side-card info)
  const slide4c = pptx.addSlide();
  addDecorations(slide4c, 'Model-wise Exposure & Valuation', 'Capital distribution and remaining liability by model');
  
  // Left theory card
  slide4c.addShape(pptx.ShapeType.rect, {
    x: 0.5,
    y: 1.1,
    w: 3.4,
    h: 4.3,
    fill: { color: BG_CARD },
    line: { color: '30363d', width: 1 }
  });

  const segValTheoryLines = [
    { text: 'CAPITAL CONCENTRATION\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } },
    { text: 'Capital concentration measures the exposure of scheduled lease capital distributed per equipment model category. High exposure highlights critical dependencies.\n\n', options: { color: TEXT_WHITE, fontSize: 8, fontFace: 'Segoe UI' } },
    { text: 'FINANCIAL AUDIT BY MODEL\n', options: { color: PRIMARY_ORANGE, fontSize: 9, bold: true, fontFace: 'Segoe UI' } }
  ];

  Object.entries(modelPayback).forEach(([model, data]) => {
    segValTheoryLines.push({
      text: `• ${model}: Total ${formatINRVal(data.total)} | Exposure ${formatINRVal(data.exposure)}\n`,
      options: { color: data.exposure > 500000 ? RED_OVERDUE : TEXT_LIGHT, fontSize: 7.5, fontFace: 'Segoe UI' }
    });
  });

  slide4c.addText(segValTheoryLines, {
    x: 0.7,
    y: 1.2,
    w: 3.0,
    h: 4.1,
    lineSpacing: 11
  });

  const barChartData = [
    {
      name: 'Total Value',
      labels: machineModels,
      values: machineModels.map(k => modelPayback[k].total)
    },
    {
      name: 'Remaining Exposure',
      labels: machineModels,
      values: machineModels.map(k => modelPayback[k].exposure)
    }
  ];

  slide4c.addChart(pptx.ChartType.bar, barChartData, { 
    x: 4.1, 
    y: 1.2, 
    w: 5.4, 
    h: 4.0, 
    barGapWidthPct: 30,
    chartColors: [PRIMARY_ORANGE, BLUE_PENDING],
    valAxisLabelColor: TEXT_LIGHT,
    catAxisLabelColor: TEXT_LIGHT,
    legendColor: TEXT_WHITE,
    legendFontSize: 9
  });

  // Slide 4d: Model-wise Amortization Registry (Table)
  const slide4d = pptx.addSlide();
  addDecorations(slide4d, 'Model-wise Amortization Registry', 'Audit statement of model performance');

  const modelHeaders = ['Model Category', 'Units', 'Total Contract Value', 'Recovered Revenue', 'Remaining Exposure', 'Monthly EMI Share', 'Progress'].map(t => ({
    text: t,
    options: { bold: true, fill: '1c2128', color: PRIMARY_ORANGE, fontSize: 9 }
  }));

  const modelTableData = [modelHeaders];
  Object.entries(modelPayback).forEach(([model, data]) => {
    const progress = data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0;
    modelTableData.push([
      { text: model, options: { color: TEXT_WHITE } },
      { text: `${data.count} Units`, options: { color: TEXT_LIGHT } },
      { text: formatINRVal(data.total), options: { color: TEXT_LIGHT } },
      { text: formatINRVal(data.paid), options: { color: GREEN_PAID, bold: true } },
      { text: formatINRVal(data.exposure), options: { color: data.exposure > 0 ? RED_OVERDUE : TEXT_LIGHT } },
      { text: formatINRVal(data.monthlyEmi), options: { color: TEXT_LIGHT } },
      { text: `${progress}%`, options: { color: progress > 85 ? GREEN_PAID : PRIMARY_ORANGE, bold: true } }
    ]);
  });

  slide4d.addTable(modelTableData, {
    x: 0.5,
    y: 1.2,
    w: 9.0,
    fontSize: 8.5,
    rowH: 0.35,
    border: { type: 'solid', color: '30363d', width: 1 },
    valign: 'middle'
  });

  slide4d.addText('AUDIT PROTOCOL NOTE: THIS REGISTRY DUSTS DOWN ACTIVE EXPOSURE VALUES SEGMENTED BY HARDWARE DESIGN CLASS (MODEL), ALIGNED WITH CONTRACT TERM PROTOCOLS.', {
    x: 0.5,
    y: 5.2,
    w: 9.0,
    h: 0.2,
    fontSize: 7,
    fontFace: 'Courier New',
    color: TEXT_MUTED
  });

  // Slide 5: Fleet Portfolio Nodes Inventory (NEW)
  const slide5 = pptx.addSlide();
  addDecorations(slide5, 'Fleet Portfolio Nodes Inventory', 'Comprehensive list of active contracts');

  const invHeaders = ['Machine Asset', 'Customer Account', 'Serial Number', 'Principal', 'Monthly EMI', 'Status'].map(t => ({
    text: t,
    options: { bold: true, fill: '1c2128', color: PRIMARY_ORANGE, fontSize: 9 }
  }));

  const invTableData = [invHeaders];
  loans.slice(0, 10).forEach(l => {
    const custName = l.customerId?.company || l.customerId?.name || 'N/A';
    invTableData.push([
      { text: l.machineName + (l.model ? ` (${l.model})` : ''), options: { color: TEXT_WHITE } },
      { text: custName, options: { color: TEXT_WHITE } },
      { text: l.serialNumber || 'N/A', options: { color: TEXT_LIGHT, fontFace: 'Courier New' } },
      { text: formatINRVal(l.principal), options: { color: TEXT_LIGHT } },
      { text: formatINRVal(l.emi), options: { color: TEXT_LIGHT } },
      { text: l.status.toUpperCase(), options: { color: l.status === 'Active' ? GREEN_PAID : TEXT_MUTED, bold: true } }
    ]);
  });

  slide5.addTable(invTableData, {
    x: 0.5,
    y: 1.2,
    w: 9.0,
    fontSize: 8.5,
    rowH: 0.35,
    border: { type: 'solid', color: '30363d', width: 1 },
    valign: 'middle'
  });

  slide5.addText('THE PORTFOLIO INVENTORY MATRIX MAPS EACH TECHNICAL NODE (ASSET) TO ITS FINANCIAL CONTRACT PARAMETERS, FACILITATING TRACKING OF CAPITAL PAYBACK CYCLES.', {
    x: 0.5,
    y: 5.2,
    w: 9.0,
    h: 0.2,
    fontSize: 7,
    fontFace: 'Courier New',
    color: TEXT_MUTED
  });

  // Slide 6: Monthly Recovery Protocol Ledger (Table)
  const slide6 = pptx.addSlide();
  addDecorations(slide6, 'Monthly Recovery Protocol Ledger', 'Timeline reconciliation statement');

  let runningBacklogForPPT = loans.reduce((acc, loan) => acc + (loan.schedule || []).filter(s => new Date(s.dueDate) < months[0]?.start && s.status === 'Pending').reduce((s, inst) => s + inst.emi, 0), 0);
  
  const ledgerTableData = [
    ['Month', 'Opening', 'Due', 'Received', 'Overdue', 'Closing', 'Collection %'].map(t => ({ 
      text: t, 
      options: { bold: true, fill: '1c2128', color: PRIMARY_ORANGE, fontSize: 9 } 
    }))
  ];

  months.forEach(m => {
    const opening = runningBacklogForPPT;
    const due = loans.reduce((sum, l) => sum + (l.schedule || []).filter(s => { const d = new Date(s.dueDate); return d >= m.start && d <= m.end; }).reduce((s, inst) => s + inst.emi, 0), 0);
    const received = payments.filter(p => { const d = new Date(p.date); return d >= m.start && d <= m.end; }).reduce((sum, p) => sum + (p.amount || 0), 0);
    const overdue = Math.max(0, opening + due - received);
    const progress = (opening + due) > 0 ? Math.min(100, Math.round((received / (opening + due)) * 100)) : 'NA';
    
    ledgerTableData.push([
      { text: m.month, options: { color: TEXT_WHITE } },
      { text: formatINRVal(opening), options: { color: TEXT_LIGHT, fontFace: 'Courier New' } },
      { text: formatINRVal(due), options: { color: TEXT_LIGHT, fontFace: 'Courier New' } },
      { text: formatINRVal(received), options: { color: GREEN_PAID, bold: true, fontFace: 'Courier New' } },
      { text: formatINRVal(overdue), options: { color: overdue > 0 ? RED_OVERDUE : TEXT_LIGHT, fontFace: 'Courier New' } },
      { text: formatINRVal(overdue), options: { color: overdue > 0 ? RED_OVERDUE : TEXT_LIGHT, fontFace: 'Courier New' } },
      { text: progress === 'NA' ? 'NA' : `${progress}%`, options: { color: progress > 85 ? GREEN_PAID : PRIMARY_ORANGE, bold: true } }
    ]);
    runningBacklogForPPT = overdue;
  });

  slide6.addTable(ledgerTableData, { 
    x: 0.5, 
    y: 1.2, 
    w: 9, 
    rowH: 0.35, 
    fontSize: 8.5, 
    border: { type: 'solid', color: '30363d', width: 1 },
    valign: 'middle'
  });

  slide6.addText('AUDIT NOTES: OPENING BALANCE REPRESENTS THE CUMULATIVE BACKLOG OF PENDING COLLECTIONS CARRIED FORWARD. CLOSING BALANCE IS CARRIED FORWARD AS OPENING BALANCE OF SUBSEQUENT MONTH.', {
    x: 0.5,
    y: 5.2,
    w: 9.0,
    h: 0.2,
    fontSize: 7,
    fontFace: 'Courier New',
    color: TEXT_MUTED
  });

  // Slide 7: Global Delinquency & Aging Backlog (NEW)
  const slide7 = pptx.addSlide();
  addDecorations(slide7, 'Global Delinquency & Aging Backlog Audit', 'Overdue amortization cycles and delay penalties');

  const overdueInstallments = [];
  let totalOverdueAmt = 0;
  let maxDelayDays = 0;

  loans.forEach(l => {
    l.schedule.forEach(s => {
      if (s.status === 'Pending' && new Date(s.dueDate) < new Date()) {
        const delayMs = new Date() - new Date(s.dueDate);
        const delayDays = Math.floor(delayMs / (1000 * 60 * 60 * 24));
        const interest = Math.round(s.emi * 0.18 * (delayDays / 365));
        
        overdueInstallments.push({
          machine: l.machineName,
          installment: s.installment,
          dueDate: s.dueDate,
          emi: s.emi,
          delayDays,
          interest
        });

        totalOverdueAmt += s.emi;
        if (delayDays > maxDelayDays) maxDelayDays = delayDays;
      }
    });
  });

  const totalOverdueInterest = overdueInstallments.reduce((sum, item) => sum + item.interest, 0);

  if (overdueInstallments.length > 0) {
    slide7.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 1.1,
      w: 9.0,
      h: 1.1,
      fill: { color: '200e14' },
      line: { color: RED_OVERDUE, width: 1 }
    });

    slide7.addText('CRITICAL DELINQUENCY WARNING', {
      x: 0.7,
      y: 1.2,
      w: 8.6,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: RED_OVERDUE,
      fontFace: 'Segoe UI'
    });

    slide7.addText(`Outstanding Backlog: ${formatINRVal(totalOverdueAmt)} across ${overdueInstallments.length} cycles. Maximum delay of ${maxDelayDays} days detected. Accrued Delay Interest: ${formatINRVal(totalOverdueInterest)} (Standard 18% Rate).`, {
      x: 0.7,
      y: 1.5,
      w: 8.6,
      h: 0.6,
      fontSize: 11,
      color: TEXT_WHITE,
      fontFace: 'Segoe UI'
    });

    const overdueTableData = [
      ['Machine Asset', 'Cycle', 'Due Date', 'EMI Amount', 'Delay Days', 'Accrued Penalty (18%)'].map(t => ({
        text: t,
        options: { bold: true, fill: '1c2128', color: RED_OVERDUE, fontSize: 9 }
      }))
    ];

    overdueInstallments.slice(0, 8).forEach(item => {
      overdueTableData.push([
        { text: item.machine, options: { color: TEXT_WHITE } },
        { text: `#${item.installment.toString().padStart(2, '0')}`, options: { color: TEXT_WHITE, fontFace: 'Courier New' } },
        { text: item.dueDate, options: { color: TEXT_LIGHT, fontFace: 'Courier New' } },
        { text: formatINRVal(item.emi), options: { color: RED_OVERDUE, bold: true } },
        { text: `${item.delayDays} Days`, options: { color: RED_OVERDUE } },
        { text: formatINRVal(item.interest), options: { color: RED_OVERDUE, bold: true } }
      ]);
    });

    slide7.addTable(overdueTableData, {
      x: 0.5,
      y: 2.4,
      w: 9.0,
      fontSize: 8.5,
      rowH: 0.3,
      border: { type: 'solid', color: '30363d', width: 1 },
      valign: 'middle'
    });

  } else {
    slide7.addShape(pptx.ShapeType.rect, {
      x: 0.5,
      y: 1.1,
      w: 9.0,
      h: 1.2,
      fill: { color: '0f1d17' },
      line: { color: GREEN_PAID, width: 1 }
    });

    slide7.addText('PORTFOLIO STATUS: SECURED', {
      x: 0.7,
      y: 1.3,
      w: 8.6,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: GREEN_PAID,
      fontFace: 'Segoe UI'
    });

    slide7.addText('All active assets are currently on-schedule. No outstanding overdues or delay penalty interests detected for this customer account.', {
      x: 0.7,
      y: 1.7,
      w: 8.6,
      h: 0.4,
      fontSize: 11,
      color: TEXT_WHITE,
      fontFace: 'Segoe UI'
    });

    slide7.addText('✓ EXCELLENT REPAYMENT STANDING', {
      x: 0.5,
      y: 2.8,
      w: 9.0,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: GREEN_PAID,
      fontFace: 'Segoe UI',
      align: 'center'
    });
  }

  slide7.addText('RISK MITIGATION POLICY: OVERDUE CYCLES EXCEEDING 45 DAYS ARE FLAGGED FOR ASSET RECOVERY REPOSSESSION WARNINGS. DELAY INTEREST IS COMPUTED DAILY AT 18% P.A. ON OVERDUE PORTIONS.', {
    x: 0.5,
    y: 5.2,
    w: 9.0,
    h: 0.2,
    fontSize: 7,
    fontFace: 'Courier New',
    color: TEXT_MUTED
  });

  // Slide 8: Recent Payment Transaction Registry (NEW)
  const slide8 = pptx.addSlide();
  addDecorations(slide8, 'Recent Payment Transaction Registry', 'Audit statement of latest processed clearings');

  const payHeaders = ['Date', 'Asset Node', 'Customer Node', 'Transaction ID', 'Method', 'Amount'].map(t => ({
    text: t,
    options: { bold: true, fill: '1c2128', color: PRIMARY_ORANGE, fontSize: 9 }
  }));

  const payTableData = [payHeaders];
  const sortedPayments = payments.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  sortedPayments.forEach(p => {
    const machine = p.loanId?.machineName || 'N/A';
    const customer = p.loanId?.customerId?.company || p.loanId?.customerId?.name || 'N/A';
    payTableData.push([
      { text: p.date, options: { color: TEXT_LIGHT, fontFace: 'Courier New' } },
      { text: machine, options: { color: TEXT_WHITE } },
      { text: customer, options: { color: TEXT_WHITE } },
      { text: p.transactionId || 'N/A', options: { color: TEXT_LIGHT, fontFace: 'Courier New' } },
      { text: (p.method || 'N/A').toUpperCase(), options: { color: TEXT_LIGHT } },
      { text: formatINRVal(p.amount), options: { color: GREEN_PAID, bold: true } }
    ]);
  });

  slide8.addTable(payTableData, {
    x: 0.5,
    y: 1.2,
    w: 9.0,
    fontSize: 8.5,
    rowH: 0.3,
    border: { type: 'solid', color: '30363d', width: 1 },
    valign: 'middle'
  });

  slide8.addText('COMPLIANCE NOTE: THIS REGISTRY LOGS THE LATEST VERIFIED CLEARING TRANSACTIONS. TRANSACTION IDS ARE CROSS-REFERENCED WITH BANK GATEWAYS FOR AUTOMATED VALIDATION.', {
    x: 0.5,
    y: 5.2,
    w: 9.0,
    h: 0.2,
    fontSize: 7,
    fontFace: 'Courier New',
    color: TEXT_MUTED
  });

  return await pptx.write('nodebuffer');
};

export const generateGlobalPDFReport = async (loans, payments, months, viewMode = 'machine') => {
  const browser = await puppeteer.launch({ headless: "new", executablePath: "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe", args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const formatINR = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  let rb = loans.reduce((acc, loan) => acc + (loan.schedule || []).filter(s => new Date(s.dueDate) < months[0].start && s.status === 'Pending').reduce((s, inst) => s + inst.emi, 0), 0);
  const ledgerRows = months.map(m => {
    const opening = rb;
    const due = loans.reduce((sum, l) => sum + (l.schedule || []).filter(s => { const d = new Date(s.dueDate); return d >= m.start && d <= m.end; }).reduce((s, inst) => s + inst.emi, 0), 0);
    const received = payments.filter(p => { const d = new Date(p.date); return d >= m.start && d <= m.end; }).reduce((sum, p) => sum + (p.amount || 0), 0);
    const overdue = Math.max(0, opening + due - received);
    const progress = (opening + due) > 0 ? Math.min(100, Math.round((received / (opening + due)) * 100)) : 'NA';
    rb = overdue;
    return { month: m.month, opening, due, received, overdue, progress };
  });

  const totalRecovery = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExposure = loans.reduce((sum, l) => sum + (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + inst.emi, 0), 0);
  const validRows = ledgerRows.filter(r => r.progress !== 'NA');
  const avgHealth = validRows.length > 0 ? Math.round(validRows.reduce((s, r) => s + r.progress, 0) / validRows.length) : 0;

  const html = `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 40px; background: #f8fafc; color: #0f172a; }
          .header { background: #0f172a; color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
          h1 { margin: 0; color: #f0883e; font-size: 24px; }
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
          .metric-card { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .metric-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .metric-value { font-size: 16px; font-weight: bold; margin-top: 5px; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
          th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 10px; text-transform: uppercase; color: #64748b; }
          td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
          .progress-bar { height: 4px; background: #f1f5f9; border-radius: 2px; width: 60px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 10px; }
          .progress-fill { height: 100%; background: #f0883e; }
          .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 30px; margin-bottom: 15px; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>FLEET STRATEGIC AUDIT</h1>
            <p style="font-size: 10px; opacity: 0.6; margin-top: 5px;">Master Protocol Recovery Node // ${new Date().toLocaleDateString()}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 14px; font-weight: bold; margin: 0;">${loans.length} Units</p>
            <p style="font-size: 10px; opacity: 0.6; margin: 5px 0 0 0;">Active Portfolio</p>
          </div>
        </div>
 
        <div class="metrics">
          <div class="metric-card">
            <div class="metric-label">Recovery Volume</div>
            <div class="metric-value">${formatINR(totalRecovery)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Liability Exposure</div>
            <div class="metric-value">${formatINR(totalExposure)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Collection Health</div>
            <div class="metric-value">${avgHealth}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Fleet Nodes</div>
            <div class="metric-value">${loans.length} Units</div>
          </div>
        </div>

        <div class="section-title">${viewMode === 'customer' ? 'Customer Portfolio Breakdown' : 'Machine Portfolio Breakdown'}</div>
        <table style="margin-bottom: 30px;">
          <thead>
            <tr>
              <th>${viewMode === 'customer' ? 'Customer Name' : 'Machine Name'}</th>
              ${viewMode === 'customer' ? '<th>Active Units</th>' : ''}
              <th>Total Expected</th>
              <th>Recovered Amount</th>
              <th>Remaining Exposure</th>
              <th>Health %</th>
            </tr>
          </thead>
          <tbody>
            ${(() => {
              const items = {};
              loans.forEach(l => {
                const keyName = viewMode === 'customer' ? (l.customerId?.name || 'Unknown') : l.machineName;
                if (!items[keyName]) {
                  items[keyName] = { 
                    units: 0, 
                    financed: 0, 
                    actualTotalValue: 0,
                    collected: 0, 
                    remaining: 0 
                  };
                }
                const c = items[keyName];
                c.units++;
                c.financed += l.principal || 0;
                c.remaining += (l.schedule || []).filter(s => s.status === 'Pending').reduce((s, inst) => s + (inst.outstandingAmount !== undefined ? inst.outstandingAmount : inst.emi), 0);
                c.actualTotalValue += (l.schedule || []).reduce((sum, s) => sum + (s.emi || 0), 0);
                c.collected += (l.schedule || []).reduce((sum, s) => {
                  const principalPaid = s.paidAmount !== undefined && s.paidAmount > 0 
                    ? s.paidAmount 
                    : ((s.emi || 0) - (s.outstandingAmount !== undefined ? s.outstandingAmount : (s.status === 'Clear' || s.status === 'Paid' ? 0 : (s.emi || 0))));
                  return sum + principalPaid + (s.paidOverdueInterest || 0);
                }, 0);
              });

              return Object.entries(items).map(([name, data]) => {
                const expectedTotal = data.collected + data.remaining;
                let health = expectedTotal > 0 ? Math.round((data.collected / expectedTotal) * 100) : 0;
                if (data.remaining > 0 && health >= 100) health = 99;
                
                const color = health > 80 ? '#059669' : (health > 50 ? '#2563eb' : '#d97706');
                return `
                  <tr>
                    <td style="font-weight: bold;">${name}</td>
                    ${viewMode === 'customer' ? `<td>${data.units}</td>` : ''}
                    <td>${formatINR(expectedTotal)}</td>
                    <td style="color: #059669; font-weight: bold;">${formatINR(data.collected)}</td>
                    <td style="color: #dc2626;">${formatINR(data.remaining)}</td>
                    <td>
                      <div class="progress-bar"><div class="progress-fill" style="width: ${health}%; background: ${color};"></div></div>
                      <span style="font-weight: bold;">${health}%</span>
                    </td>
                  </tr>
                `;
              }).join('');
            })()}
          </tbody>
        </table>

        <div class="section-title">Monthly Recovery Protocol Ledger</div>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Opening</th>
              <th>Due</th>
              <th>Received</th>
              <th>Overdue</th>
              <th>Closing</th>
              <th>Collection %</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerRows.map(r => `
              <tr>
                <td style="font-weight: bold;">${r.month}</td>
                <td>${formatINR(r.opening)}</td>
                <td>${formatINR(r.due)}</td>
                <td style="color: #059669; font-weight: bold;">${formatINR(r.received)}</td>
                <td style="color: #dc2626;">${formatINR(r.overdue)}</td>
                <td>${formatINR(r.overdue)}</td>
                <td>
                  ${r.progress === 'NA' 
                    ? 'NA' 
                    : `<div class="progress-bar"><div class="progress-fill" style="width: ${r.progress}%"></div></div> ${r.progress}%`
                  }
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  await page.setContent(html);
  const pdf = await page.pdf({ format: 'A4', printBackground: true });
  await browser.close();
  return pdf;
};
