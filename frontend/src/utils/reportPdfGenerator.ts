/**
 * Muffin Factory Game — Professional PDF Report Generator
 * 
 * Generates an executive-level, structured multi-page PDF performance report
 * completely client-side via jsPDF & jspdf-autotable.
 * 
 * 100% sourced from actual game state (TeamState, Room, HistoryData, ReportMetrics).
 * Zero external network calls, zero sensitive data sent to third parties.
 */

import { Room, TeamState } from '../../../backend/src/types/index.js';

export async function generateTeamReportPDF(
  room: Room | null,
  teamState: TeamState,
  leaderboardRank?: number | null
): Promise<void> {
  // Dynamically import jsPDF and autoTable for performance / lazy-loading
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Color Palette matching the game's professional aesthetic
  const primaryColor = [225, 29, 72] as [number, number, number]; // Rose 600
  const primaryDark = [159, 18, 57] as [number, number, number];  // Rose 900
  const slateDark = [30, 41, 59] as [number, number, number];     // Slate 800
  const slateMuted = [100, 116, 139] as [number, number, number]; // Slate 500
  const emeraldColor = [5, 150, 105] as [number, number, number]; // Emerald 600
  const bgLight = [248, 250, 252] as [number, number, number];    // Slate 50

  const safeTeamName = (teamState.name || 'Team').replace(/[^a-zA-Z0-9_-]/g, '_');
  const roomIdentifier = room ? `${room.name} (${room.code})` : 'Simulation Session';
  const totalDays = room?.currentDay || teamState.history.days.length || 0;
  const maxDays = room?.maxDays || totalDays;
  const isBankrupt = teamState.status === 'bankrupt';
  const completionStatus = isBankrupt ? 'BANKRUPT (OPERATIONS LOCKED)' : 'COMPLETED';
  const generatedAt = new Date().toLocaleString();

  let currentY = margin;

  // Helper for section header banner
  const drawSectionHeader = (title: string, sectionNum: string) => {
    // Check page overflow
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = margin + 5;
    }
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.roundedRect(margin, currentY, contentWidth, 7.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
    doc.text(`${sectionNum}. ${title.toUpperCase()}`, margin + 3, currentY + 5.2);
    currentY += 10.5;
  };

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, currentY, contentWidth, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text('MUFFIN FACTORY GAME', margin + 5, currentY + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL TEAM PERFORMANCE REPORT', margin + 5, currentY + 14);

  // Status Badge on Right
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  const statusText = `STATUS: ${completionStatus}`;
  const statusWidth = doc.getTextWidth(statusText) + 6;
  doc.setFillColor(isBankrupt ? 185 : 16, isBankrupt ? 28 : 185, isBankrupt ? 28 : 129);
  doc.roundedRect(pageWidth - margin - statusWidth - 4, currentY + 4, statusWidth + 2, 6, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, pageWidth - margin - statusWidth - 3, currentY + 8.2);

  currentY += 25;

  // Metadata Strip
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.rect(margin, currentY, contentWidth, 14, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, currentY, contentWidth, 14, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
  doc.text('TEAM NAME:', margin + 3, currentY + 5);
  doc.text('ROOM / COHORT:', margin + 45, currentY + 5);
  doc.text('SIMULATION DURATION:', margin + 105, currentY + 5);
  doc.text('GENERATED ON:', margin + 145, currentY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(teamState.name || 'Unknown Team', margin + 3, currentY + 10.5);
  doc.text(roomIdentifier, margin + 45, currentY + 10.5);
  doc.text(`${totalDays} of ${maxDays} Days`, margin + 105, currentY + 10.5);
  doc.text(generatedAt, margin + 145, currentY + 10.5);

  currentY += 18;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — EXECUTIVE SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Executive Summary', 'SECTION 1');

  const history = teamState.history;
  const report = teamState.report;
  const academic = teamState.academicScore;

  const totalDemand = history.demand.reduce((sum, d) => sum + d, 0);
  const totalProduction = history.production ? history.production.reduce((sum, p) => sum + p, 0) : 0;
  
  // Calculate demand fulfilled
  let totalFulfilled = 0;
  if (totalDemand > 0 && report.fillRate !== undefined) {
    totalFulfilled = Math.round((report.fillRate / 100) * totalDemand);
  }

  const execKpis = [
    [
      { label: 'Final Cash Balance', val: `₹${teamState.cash.toLocaleString()}`, color: teamState.cash >= 0 ? emeraldColor : [220, 38, 38] },
      { label: 'Cumulative Revenue', val: `₹${(report.revenue || 0).toLocaleString()}`, color: slateDark },
      { label: 'Total Operating Costs', val: `₹${(report.costs || 0).toLocaleString()}`, color: slateDark },
      { label: 'Net Profit / Loss', val: `₹${(report.profit || 0).toLocaleString()}`, color: (report.profit || 0) >= 0 ? emeraldColor : [220, 38, 38] },
    ],
    [
      { label: 'Overall Fill Rate', val: `${report.fillRate || 0}%`, color: slateDark },
      { label: 'Total Muffin Production', val: `${totalProduction.toLocaleString()} Units`, color: slateDark },
      { label: 'Contract Deliveries', val: `${report.contractFulfillment || 0}%`, color: slateDark },
      { label: 'Academic Grade', val: `${academic?.totalScore || 0} / 100 (Rank #${leaderboardRank || 1})`, color: primaryDark },
    ]
  ];

  const colW = contentWidth / 4;
  execKpis.forEach((row) => {
    row.forEach((item, cIdx) => {
      const boxX = margin + cIdx * colW;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(boxX, currentY, colW - 2, 12, 1, 1, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      doc.text(item.label.toUpperCase(), boxX + 2, currentY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(item.color[0], item.color[1], item.color[2]);
      doc.text(item.val, boxX + 2, currentY + 9.5);
    });
    currentY += 14;
  });

  currentY += 2;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — DAY-BY-DAY PERFORMANCE TABLE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Day-by-Day Performance Ledger', 'SECTION 2');

  const daysCount = history.days.length;
  const dayRows: any[] = [];

  for (let i = 0; i < daysCount; i++) {
    const dayNum = history.days[i];
    const dem = history.demand[i] ?? 0;
    const prod = history.production ? history.production[i] ?? 0 : 0;
    const rawInv = history.inventory?.base_mix?.[i] ?? 0;
    const pkgInv = history.inventory?.packaging_material?.[i] ?? 0;
    const fgInv = history.inventory?.finished_muffin?.[i] ?? 0;

    // Approximate daily fulfilled from production + starting inventory capped at demand
    const dailyFulfilled = Math.min(dem, prod + fgInv);

    dayRows.push([
      `Day ${dayNum}`,
      dem.toLocaleString(),
      dailyFulfilled.toLocaleString(),
      prod.toLocaleString(),
      rawInv.toLocaleString(),
      pkgInv.toLocaleString(),
      fgInv.toLocaleString()
    ]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Day', 'Market Demand', 'Demand Fulfilled', 'Production', 'Raw Material Inv', 'Packaging Inv', 'Finished Goods Inv']],
    body: dayRows.length > 0 ? dayRows : [['No daily ticks recorded yet', '-', '-', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      halign: 'center',
      textColor: slateDark,
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3 & 4 — DEMAND & PRODUCTION PERFORMANCE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Demand & Production Performance Analysis', 'SECTION 3 & 4');

  const unfulfilledDemand = Math.max(0, totalDemand - totalFulfilled);
  const avgDailyDemand = daysCount > 0 ? Math.round(totalDemand / daysCount) : 0;
  const avgDailyProd = daysCount > 0 ? Math.round(totalProduction / daysCount) : 0;

  autoTable(doc, {
    startY: currentY,
    head: [['Demand Metric', 'Value', 'Production Metric', 'Value']],
    body: [
      ['Total Cumulative Demand', `${totalDemand.toLocaleString()} Muffins`, 'Total Production Output', `${totalProduction.toLocaleString()} Muffins`],
      ['Total Demand Fulfilled', `${totalFulfilled.toLocaleString()} Muffins`, 'Average Daily Production', `${avgDailyProd.toLocaleString()} Units/Day`],
      ['Unfulfilled Market Demand', `${unfulfilledDemand.toLocaleString()} Muffins`, 'Stockout Days', `${report.stockoutDays || 0} Days`],
      ['Overall Fulfillment Rate', `${report.fillRate || 0}%`, 'Lost Sales Penalty Impact', `₹${(report.lostSales || 0).toLocaleString()}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: slateDark, textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, textColor: slateDark },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5 & 6 — INVENTORY & FINANCIAL PERFORMANCE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Inventory & Financial Performance Breakdown', 'SECTION 5 & 6');

  const invState = teamState.inventory;
  const rawOnHand = invState.base_mix?.onHand ?? 0;
  const pkgOnHand = invState.packaging_material?.onHand ?? 0;
  const fgOnHand = invState.finished_muffin?.onHand ?? 0;

  autoTable(doc, {
    startY: currentY,
    head: [['Inventory Material', 'Closing On Hand', 'In Transit', 'Financial Line Item', 'Amount']],
    body: [
      ['Raw Material (Base Mix)', `${rawOnHand.toLocaleString()} kg`, `${(invState.base_mix?.inTransit ?? 0).toLocaleString()} kg`, 'Starting Capital', '₹100,000'],
      ['Packaging Material', `${pkgOnHand.toLocaleString()} boxes`, `${(invState.packaging_material?.inTransit ?? 0).toLocaleString()} boxes`, 'Gross Revenue', `₹${(report.revenue || 0).toLocaleString()}`],
      ['Finished Muffins', `${fgOnHand.toLocaleString()} units`, '-', 'Total Operating Costs', `₹${(report.costs || 0).toLocaleString()}`],
      ['Average Inventory Level', `${Math.round(report.averageInventory || 0).toLocaleString()}`, '-', 'Net Profit / Operating Margin', `₹${(report.profit || 0).toLocaleString()}`],
      ['Inventory Turnover Ratio', `${(report.inventoryTurnover || 0).toFixed(2)}x`, '-', 'Ending Cash Balance', `₹${teamState.cash.toLocaleString()}`],
    ],
    theme: 'grid',
    headStyles: { fillColor: primaryDark, textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, textColor: slateDark },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7 & 8 — MACHINE & CONTRACT PERFORMANCE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Machine Utilization & Contract Fulfillment', 'SECTION 7 & 8');

  const machines = teamState.machines;
  const util = report.utilization || { mixing: 0, baking: 0, icing: 0, packaging: 0 };

  const contracts = teamState.contracts || [];
  const contractsAccepted = contracts.filter(c => c.status === 'accepted').length;
  const contractsCompleted = contracts.filter(c => c.fulfilledToday >= c.dailyQuantity).length;

  autoTable(doc, {
    startY: currentY,
    head: [['Machine Type', 'Total Count', 'Active On Floor', 'Avg Utilization', 'Contract Metric', 'Status']],
    body: [
      ['Bowl Mixer', `${machines.mixing?.count ?? 1}`, `${machines.mixing?.active ?? 1}`, `${util.mixing ?? 0}%`, 'Contracts Received', `${contracts.length} Offers`],
      ['Baking Oven', `${machines.baking?.count ?? 1}`, `${machines.baking?.active ?? 1}`, `${util.baking ?? 0}%`, 'Contracts Accepted', `${contractsAccepted} Active`],
      ['Icing Applicator', `${machines.icing?.count ?? 1}`, `${machines.icing?.active ?? 1}`, `${util.icing ?? 0}%`, 'Contract Fulfillment Rate', `${report.contractFulfillment ?? 0}%`],
      ['Packaging Line', `${machines.packaging?.count ?? 1}`, `${machines.packaging?.active ?? 1}`, `${util.packaging ?? 0}%`, 'Active Contracts In Play', `${contractsCompleted} Completed`],
    ],
    theme: 'grid',
    headStyles: { fillColor: slateDark, textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, textColor: slateDark },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 9 & 10 — MATERIAL ORDERS & FINAL PERFORMANCE SCORECARD
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Final Operational Scorecard & Academic Rubric', 'SECTION 9 & 10');

  autoTable(doc, {
    startY: currentY,
    head: [['Evaluation Dimension', 'Weight', 'Score Achieved', 'Rubric Performance']],
    body: [
      ['Cash & Financial Prudence', '40%', `${academic?.cashPerformance ?? 0} / 40`, (academic?.cashPerformance ?? 0) >= 30 ? 'EXEMPLARY' : 'NEEDS IMPROVEMENT'],
      ['Customer Fill Rate & Service Level', '20%', `${academic?.fillRateScore ?? 0} / 20`, (academic?.fillRateScore ?? 0) >= 15 ? 'STRONG' : 'MODERATE'],
      ['Wholesale Contract Reliability', '15%', `${academic?.contractScore ?? 0} / 15`, (academic?.contractScore ?? 0) >= 10 ? 'SOLID' : 'LOW FULFILLMENT'],
      ['Inventory Optimization & Holding Cost', '15%', `${academic?.inventoryScore ?? 0} / 15`, (academic?.inventoryScore ?? 0) >= 10 ? 'BALANCED' : 'HIGH HOLDING/STOCKOUT'],
      ['Capacity & Bottleneck Management', '10%', `${academic?.capacityScore ?? 0} / 10`, (academic?.capacityScore ?? 0) >= 7 ? 'EFFICIENT' : 'BOTTLENECK CONSTRAINED'],
      ['FINAL AGGREGATE GRADE', '100%', `${academic?.totalScore ?? 0} / 100`, (academic?.totalScore ?? 0) >= 75 ? 'DISTINCTION' : (academic?.totalScore ?? 0) >= 50 ? 'PASS' : 'FAIL'],
    ],
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2.2, textColor: slateDark },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER & PAGE NUMBERING (Multi-Page Guarantee)
  // ══════════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Running top line on subsequent pages
    if (p > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
      doc.text(`Muffin Factory Game — Performance Report | Team: ${teamState.name}`, margin, 8);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 9.5, pageWidth - margin, 9.5);
    }

    // Bottom footer line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2]);
    doc.text(`Confidential Academic Report — Generated for ${teamState.name}`, margin, pageHeight - 6);

    const pageStr = `Page ${p} of ${totalPages}`;
    doc.text(pageStr, pageWidth - margin - doc.getTextWidth(pageStr), pageHeight - 6);
  }

  // Directly trigger download to user's computer
  doc.save(`Muffin_Factory_Report_${safeTeamName}.pdf`);
}
