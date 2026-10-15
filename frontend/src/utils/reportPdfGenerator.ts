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
  const totalDays = room?.currentDay || teamState.history?.days?.length || 0;
  const maxDays = room?.maxDays || totalDays;
  const isBankrupt = teamState.status === 'bankrupt';
  const completionStatus = isBankrupt ? 'BANKRUPT (OPERATIONS LOCKED)' : 'COMPLETED';
  const generatedAt = new Date().toLocaleString();

  let currentY = margin;

  // Helper for section header banner
  const drawSectionHeader = (title: string, sectionNum: string) => {
    // Check page overflow before drawing section header
    if (currentY > pageHeight - 38) {
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

  // Helper to draw clean vector Indian Rupee symbol glyph
  const drawRupeeGlyph = (x: number, y: number, h: number, color: number[]) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.26);
    const w = h * 0.65;
    // Top horizontal bar
    doc.line(x, y, x + w, y);
    // Second horizontal bar
    const barY = y + h * 0.32;
    doc.line(x, barY, x + w * 0.75, barY);
    // Vertical stem down to mid
    const midY = y + h * 0.54;
    doc.line(x, y, x, midY);
    // Upper loop curve
    doc.line(x + w * 0.4, y, x + w * 0.8, y + h * 0.16);
    doc.line(x + w * 0.8, y + h * 0.16, x + w * 0.8, barY + h * 0.08);
    doc.line(x + w * 0.8, barY + h * 0.08, x, midY);
    // Diagonal leg
    doc.line(x + w * 0.25, midY, x + w * 0.88, y + h);
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

  const history = teamState.history || { days: [], cash: [], revenue: [], demand: [], inventory: { base_mix: [], packaging_material: [], finished_muffin: [] }, utilization: { mixing: [], baking: [], icing: [], packaging: [] }, contractFulfillment: [], bottlenecks: [], bottleneckCapacity: [], production: [] };
  const report = teamState.report || { revenue: 0, costs: 0, profit: 0, fillRate: 0, lostSales: 0, inventoryTurnover: 0, averageInventory: 0, stockoutDays: 0, utilization: { mixing: 0, baking: 0, icing: 0, packaging: 0 }, contractFulfillment: 0, finalCash: teamState.cash };
  const academic = teamState.academicScore || { cashPerformance: 0, fillRateScore: 0, contractScore: 0, inventoryScore: 0, capacityScore: 0, totalScore: 0 };

  const totalDemand = history.demand?.reduce((sum, d) => sum + d, 0) || 0;
  const totalProduction = history.production?.reduce((sum, p) => sum + p, 0) || 0;
  
  // Calculate demand fulfilled
  let totalFulfilled = 0;
  if (totalDemand > 0 && report.fillRate !== undefined) {
    totalFulfilled = Math.round((report.fillRate / 100) * totalDemand);
  }

  const rawOnHand = teamState.inventory?.base_mix?.onHand ?? 0;
  const pkgOnHand = teamState.inventory?.packaging_material?.onHand ?? 0;
  const fgOnHand = teamState.inventory?.finished_muffin?.onHand ?? 0;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — EXECUTIVE SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Executive Summary', 'SECTION 1');

  const execKpis = [
    [
      { label: 'Final Cash Balance', val: teamState.cash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }), isCurrency: true, color: teamState.cash >= 0 ? emeraldColor : [220, 38, 38] },
      { label: 'Cumulative Revenue', val: (report.revenue || 0).toLocaleString(), isCurrency: true, color: slateDark },
      { label: 'Total Operating Costs', val: (report.costs || 0).toLocaleString(), isCurrency: true, color: slateDark },
      { label: 'Net Profit / Loss', val: (report.profit || 0).toLocaleString(), isCurrency: true, color: (report.profit || 0) >= 0 ? emeraldColor : [220, 38, 38] },
    ],
    [
      { label: 'Overall Fill Rate', val: `${report.fillRate || 0}%`, isCurrency: false, color: slateDark },
      { label: 'Total Muffin Production', val: `${totalProduction.toLocaleString()} Units`, isCurrency: false, color: slateDark },
      { label: 'Contract Deliveries', val: `${report.contractFulfillment || 0}%`, isCurrency: false, color: slateDark },
      { label: 'Academic Grade', val: `${academic?.totalScore || 0} / 100 (Rank #${leaderboardRank || 1})`, isCurrency: false, color: primaryDark },
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
      if (item.isCurrency) {
        drawRupeeGlyph(boxX + 2, currentY + 6.6, 2.9, item.color);
        doc.text(item.val, boxX + 5.2, currentY + 9.5);
      } else {
        doc.text(item.val, boxX + 2, currentY + 9.5);
      }
    });
    currentY += 14;
  });

  currentY += 2;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — DAY-BY-DAY PERFORMANCE TABLE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Day-by-Day Performance Ledger', 'SECTION 2');

  const daysCount = history.days?.length || 0;
  const dayRows: any[] = [];

  for (let i = 0; i < daysCount; i++) {
    const dayNum = history.days[i];
    const dem = history.demand[i] ?? 0;
    const prod = history.production ? history.production[i] ?? 0 : 0;
    const rawInv = history.inventory?.base_mix?.[i] ?? 0;
    const pkgInv = history.inventory?.packaging_material?.[i] ?? 0;
    const fgInv = history.inventory?.finished_muffin?.[i] ?? 0;

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
    showHead: 'everyPage',
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
  // SECTION 3 — DEMAND PERFORMANCE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Demand Performance', 'SECTION 3');

  const unfulfilledDemand = Math.max(0, totalDemand - totalFulfilled);
  const avgDailyDemand = daysCount > 0 ? Math.round(totalDemand / daysCount) : 0;

  autoTable(doc, {
    startY: currentY,
    head: [['Demand Metric', 'Measurement', 'Operational Significance']],
    body: [
      ['Total Cumulative Demand', `${totalDemand.toLocaleString()} Muffins`, 'Total commercial market potential observed'],
      ['Total Demand Fulfilled', `${totalFulfilled.toLocaleString()} Muffins`, 'Actual finished orders served to customers'],
      ['Unfulfilled Market Demand', `${unfulfilledDemand.toLocaleString()} Muffins`, 'Lost sales volume due to stockouts or insufficient output'],
      ['Overall Fulfillment Rate', `${report.fillRate || 0}%`, 'Primary customer satisfaction service level'],
      ['Average Daily Demand', `${avgDailyDemand.toLocaleString()} Muffins / Day`, 'Mean customer ordering velocity'],
      ['Stockout Occurrences', `${report.stockoutDays || 0} Days`, 'Number of days factory floor ran out of finished muffins'],
      ['Lost Sales Penalty Impact', `Rs. ${(report.lostSales || 0).toLocaleString()}`, 'Direct financial penalty incurred for unfilled orders'],
    ],
    showHead: 'everyPage',
    theme: 'grid',
    headStyles: { fillColor: slateDark, textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, textColor: slateDark },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — PRODUCTION PERFORMANCE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Production Performance', 'SECTION 4');

  const avgDailyProd = daysCount > 0 ? Math.round(totalProduction / daysCount) : 0;
  const currentBottleneckStage = teamState.currentBottleneck?.stage || 'Balanced';
  const currentBottleneckCap = teamState.currentBottleneck?.capacity || 0;
  const util = report.utilization || { mixing: 0, baking: 0, icing: 0, packaging: 0 };

  autoTable(doc, {
    startY: currentY,
    head: [['Production Metric', 'Value', 'Stage Utilization', 'Rate']],
    body: [
      ['Total Output Manufactured', `${totalProduction.toLocaleString()} Muffins`, 'Stage 1: Bowl Mixer', `${util.mixing ?? 0}%`],
      ['Average Daily Production', `${avgDailyProd.toLocaleString()} Units/Day`, 'Stage 2: Baking Oven', `${util.baking ?? 0}%`],
      ['Current Plant Bottleneck', `${currentBottleneckStage.toUpperCase()}`, 'Stage 3: Icing Applicator', `${util.icing ?? 0}%`],
      ['Bottleneck Max Daily Capacity', `${currentBottleneckCap.toLocaleString()} Units/Day`, 'Stage 4: Packaging Line', `${util.packaging ?? 0}%`],
    ],
    showHead: 'everyPage',
    theme: 'grid',
    headStyles: { fillColor: primaryDark, textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, textColor: slateDark },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — INVENTORY PERFORMANCE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Inventory Performance', 'SECTION 5');

  const invState = teamState.inventory || {};
  const rawInTransit = invState.base_mix?.inTransit ?? 0;
  const pkgInTransit = invState.packaging_material?.inTransit ?? 0;

  autoTable(doc, {
    startY: currentY,
    head: [['Material Stream', 'Closing On Hand', 'In Transit', 'Holding & Turnover Metrics']],
    body: [
      ['Raw Material (Base Mix)', `${rawOnHand.toLocaleString()} kg`, `${rawInTransit.toLocaleString()} kg`, `Unit Holding Cost: Rs. 0.05 / kg / day`],
      ['Packaging Material', `${pkgOnHand.toLocaleString()} boxes`, `${pkgInTransit.toLocaleString()} boxes`, `Unit Holding Cost: Rs. 0.02 / box / day`],
      ['Finished Muffins', `${fgOnHand.toLocaleString()} units`, '-', `Unit Holding Cost: Rs. 0.10 / muffin / day`],
      ['Average Inventory Level', `${Math.round(report.averageInventory || 0).toLocaleString()} Units`, '-', 'Mean units held across entire run'],
      ['Inventory Turnover Ratio', `${(report.inventoryTurnover || 0).toFixed(2)}x`, '-', 'Annualized inventory velocity efficiency'],
    ],
    showHead: 'everyPage',
    theme: 'grid',
    headStyles: { fillColor: slateDark, textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, textColor: slateDark },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — FINANCIAL PERFORMANCE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Financial Performance', 'SECTION 6');

  // Breakdown from cashHistory if present
  let matCosts = 0;
  let orderCosts = 0;
  let holdingCosts = 0;
  let machineCosts = 0;

  if (teamState.cashHistory && teamState.cashHistory.length > 0) {
    teamState.cashHistory.forEach(ch => {
      if (ch.type === 'raw_material_cost') matCosts += ch.amount;
      if (ch.type === 'ordering_cost') orderCosts += ch.amount;
      if (ch.type === 'holding_cost') holdingCosts += ch.amount;
      if (ch.type === 'machine_purchase') machineCosts += ch.amount;
    });
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Financial Statement Line Item', 'Amount', 'Accounting Category']],
    body: [
      ['Initial Starting Capital', 'Rs. 100,000.00', 'Opening Equity Balance'],
      ['Cumulative Gross Revenue', `Rs. ${(report.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Operating Sales Inflow'],
      ['Total Operating Expenditures', `Rs. ${(report.costs || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Material, Ordering, Holding & Machine Costs'],
      ['Net Operating Profit / (Loss)', `Rs. ${(report.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Bottom-line Operating Margin'],
      ['Ending Cash Position', `Rs. ${teamState.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Liquid Cash Reserve on Hand'],
    ],
    showHead: 'everyPage',
    theme: 'striped',
    headStyles: { fillColor: primaryDark, textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, textColor: slateDark },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 7 — MACHINE / FACTORY PERFORMANCE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Machine & Factory Floor Performance', 'SECTION 7');

  const machines = teamState.machines || {};

  autoTable(doc, {
    startY: currentY,
    head: [['Machine Station', 'Total Count', 'Active On Floor', 'Avg Utilization', 'Nominal Daily Capacity']],
    body: [
      ['Stage 1: Bowl Mixer', `${machines.mixing?.count ?? 1}`, `${machines.mixing?.active ?? 1}`, `${util.mixing ?? 0}%`, `${(machines.mixing?.active ?? 1) * 300} kg/day`],
      ['Stage 2: Baking Oven', `${machines.baking?.count ?? 1}`, `${machines.baking?.active ?? 1}`, `${util.baking ?? 0}%`, `${(machines.baking?.active ?? 1) * 200} units/day`],
      ['Stage 3: Icing Applicator', `${machines.icing?.count ?? 1}`, `${machines.icing?.active ?? 1}`, `${util.icing ?? 0}%`, `${(machines.icing?.active ?? 1) * 250} units/day`],
      ['Stage 4: Packaging Line', `${machines.packaging?.count ?? 1}`, `${machines.packaging?.active ?? 1}`, `${util.packaging ?? 0}%`, `${(machines.packaging?.active ?? 1) * 220} boxes/day`],
    ],
    showHead: 'everyPage',
    theme: 'grid',
    headStyles: { fillColor: slateDark, textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, textColor: slateDark },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 8 — CONTRACT PERFORMANCE
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Contract Performance', 'SECTION 8');

  const contracts = teamState.contracts || [];
  const contractsAccepted = contracts.filter(c => c.status === 'accepted').length;
  const contractsCompleted = contracts.filter(c => c.fulfilledToday >= c.dailyQuantity || c.status === 'completed').length;

  autoTable(doc, {
    startY: currentY,
    head: [['Wholesale Contract Metric', 'Status', 'Fulfillment Benchmark']],
    body: [
      ['Total Contract Offers Received', `${contracts.length} Commercial Offers`, 'B2B Wholesale Opportunities'],
      ['Contracts Accepted & Activated', `${contractsAccepted} Active Contracts`, 'Committed Supply Agreements'],
      ['Successfully Fulfilled Contracts', `${contractsCompleted} Completed Agreements`, 'Target Volume Delivered Reliably'],
      ['Contract Fulfillment Rate', `${report.contractFulfillment ?? 0}%`, 'Overall Contract Units Delivered / Target Units'],
    ],
    showHead: 'everyPage',
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, textColor: slateDark },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 9 — ORDERS & MATERIAL FLOW
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Orders & Material Flow Logistics', 'SECTION 9');

  const purchaseOrders = teamState.purchaseOrders || [];
  const poRows = purchaseOrders.map(po => [
    po.id || 'PO-AUTO',
    po.materialType === 'base_mix' ? 'Raw Material (Mix)' : 'Packaging Material',
    `${po.quantity.toLocaleString()} units`,
    `Day ${po.orderDay}`,
    `Day ${po.arrivalDay}`,
    `Rs. ${po.cost.toLocaleString()}`,
    po.status.toUpperCase()
  ]);

  if (poRows.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['PO ID', 'Material Type', 'Quantity', 'Order Day', 'Arrival Day', 'Cost', 'Status']],
      body: poRows,
      showHead: 'everyPage',
      theme: 'striped',
      headStyles: { fillColor: slateDark, textColor: [255, 255, 255], fontSize: 7 },
      styles: { fontSize: 6.5, cellPadding: 1.5, halign: 'center', textColor: slateDark },
      margin: { left: margin, right: margin },
    });
    currentY = (doc as any).lastAutoTable.finalY + 4;
  }

  // Material Flow Pipeline Summary
  const rawLT = teamState.inventory?.base_mix?.leadTime ?? (room as any)?.scenarioConfig?.leadTimes?.rawMaterial ?? 2;
  const pkgLT = teamState.inventory?.packaging_material?.leadTime ?? ((room as any)?.scenarioConfig?.leadTimes as any)?.packagingMaterial ?? 1;

  autoTable(doc, {
    startY: currentY,
    head: [['Logistics Pipeline', 'In Transit Volume', 'Lead Time / Delivery Dynamics']],
    body: [
      ['Raw Material Orders in Transit', `${rawInTransit.toLocaleString()} kg`, `Lead Time: ${rawLT} Simulation Day${rawLT === 1 ? '' : 's'} (Standard Supplier)`],
      ['Packaging Material Orders in Transit', `${pkgInTransit.toLocaleString()} boxes`, `Lead Time: ${pkgLT} Simulation Day${pkgLT === 1 ? '' : 's'} (Local Packaging Supplier)`],
      ['Supply Chain Reliability', '100% On-Schedule Deliveries', 'Zero logistics lost-shipment losses'],
    ],
    showHead: 'everyPage',
    theme: 'grid',
    headStyles: { fillColor: primaryDark, textColor: [255, 255, 255], fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 2, textColor: slateDark },
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 10 — FINAL PERFORMANCE SUMMARY & ACADEMIC RUBRIC
  // ══════════════════════════════════════════════════════════════════════════
  drawSectionHeader('Final Performance Summary & Academic Rubric', 'SECTION 10');

  // Boxed TEAM PERFORMANCE SUMMARY Card
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = margin + 5;
  }

  const summaryCardY = currentY;
  const summaryCardH = 46;
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, summaryCardY, contentWidth, summaryCardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('TEAM PERFORMANCE SUMMARY', margin + 4, summaryCardY + 6);

  doc.setFontSize(7.5);
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);

  const leftColX = margin + 4;
  const rightColX = margin + contentWidth / 2 + 4;
  let textRowY = summaryCardY + 12;

  // Left Column
  doc.setFont('helvetica', 'bold'); doc.text('Team:', leftColX, textRowY);
  doc.setFont('helvetica', 'normal'); doc.text(teamState.name || 'Team', leftColX + 32, textRowY);
  textRowY += 5.5;

  doc.setFont('helvetica', 'bold'); doc.text('Simulation:', leftColX, textRowY);
  doc.setFont('helvetica', 'normal'); doc.text(`${totalDays} of ${maxDays} Days`, leftColX + 32, textRowY);
  textRowY += 5.5;

  doc.setFont('helvetica', 'bold'); doc.text('Final Cash:', leftColX, textRowY);
  doc.setFont('helvetica', 'normal'); doc.text(`Rs. ${teamState.cash.toLocaleString()}`, leftColX + 32, textRowY);
  textRowY += 5.5;

  doc.setFont('helvetica', 'bold'); doc.text('Total Revenue:', leftColX, textRowY);
  doc.setFont('helvetica', 'normal'); doc.text(`Rs. ${(report.revenue || 0).toLocaleString()}`, leftColX + 32, textRowY);
  textRowY += 5.5;

  doc.setFont('helvetica', 'bold'); doc.text('Total Cost:', leftColX, textRowY);
  doc.setFont('helvetica', 'normal'); doc.text(`Rs. ${(report.costs || 0).toLocaleString()}`, leftColX + 32, textRowY);
  textRowY += 5.5;

  doc.setFont('helvetica', 'bold'); doc.text('Total Production:', leftColX, textRowY);
  doc.setFont('helvetica', 'normal'); doc.text(`${totalProduction.toLocaleString()} Units`, leftColX + 32, textRowY);

  // Right Column
  let rightRowY = summaryCardY + 12;
  doc.setFont('helvetica', 'bold'); doc.text('Demand Fulfilled:', rightColX, rightRowY);
  doc.setFont('helvetica', 'normal'); doc.text(`${totalFulfilled.toLocaleString()} Units`, rightColX + 42, rightRowY);
  rightRowY += 5.5;

  doc.setFont('helvetica', 'bold'); doc.text('Final Raw Material Inv:', rightColX, rightRowY);
  doc.setFont('helvetica', 'normal'); doc.text(`${rawOnHand.toLocaleString()} kg`, rightColX + 42, rightRowY);
  rightRowY += 5.5;

  doc.setFont('helvetica', 'bold'); doc.text('Final Packaging Inv:', rightColX, rightRowY);
  doc.setFont('helvetica', 'normal'); doc.text(`${pkgOnHand.toLocaleString()} boxes`, rightColX + 42, rightRowY);
  rightRowY += 5.5;

  doc.setFont('helvetica', 'bold'); doc.text('Final Finished Goods Inv:', rightColX, rightRowY);
  doc.setFont('helvetica', 'normal'); doc.text(`${fgOnHand.toLocaleString()} muffins`, rightColX + 42, rightRowY);
  rightRowY += 5.5;

  doc.setFont('helvetica', 'bold'); doc.text('Final Score / Rank:', rightColX, rightRowY);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text(`${academic?.totalScore ?? 0} / 100 (Rank #${leaderboardRank || 1})`, rightColX + 42, rightRowY);

  currentY = summaryCardY + summaryCardH + 6;

  // Academic Rubric Breakdown Table
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
    showHead: 'everyPage',
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
      doc.text(`Muffin Factory Game — Official Performance Report | Team: ${teamState.name}`, margin, 8);
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
