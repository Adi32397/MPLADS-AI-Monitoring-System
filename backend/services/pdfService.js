const PDFDocument = require('pdfkit');
const path = require('path');

const generateSanctionOrderPDF = (project, res) => {
  const doc = new PDFDocument({ margin: 50 });
  
  // Set response headers for PDF download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="Sanction_Order_${project.Project_ID}.pdf"`);
  
  // Pipe the PDF document to the response stream
  doc.pipe(res);

  // Helper functions
  const formatCurrency = (amount) => `Rs. ${(amount || 0).toLocaleString('en-IN')}`;
  
  // HEADER
  doc.rect(0, 0, doc.page.width, 15).fill('#1e293b');
  doc.moveDown(1);
  
  // Add CivicShield Logo
  const logoPath = path.join(__dirname, '../../frontend/public/civicshield-logo.png');
  try {
    doc.image(logoPath, 50, 30, { width: 100 });
  } catch (e) {
    console.warn("Could not load logo for PDF", e);
  }
  
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#1e293b').text('GOVERNMENT OF INDIA', { align: 'center' });
  doc.fontSize(12).font('Helvetica').fillColor('#64748b').text('MPLADS Monitoring & Verification Prototype', { align: 'center' });
  doc.moveDown(1);
  
  // Draw line starting after the logo
  doc.moveTo(170, 100).lineTo(doc.page.width - 50, 100).strokeColor('#cbd5e1').stroke();
  doc.moveDown(1.5);

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text('PROJECT SANCTION & VERIFICATION ORDER', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica-Oblique').fillColor('#ef4444').text('DEMO / PROTOTYPE DOCUMENT - NOT AN OFFICIAL GOVERNMENT DOCUMENT', { align: 'center' });
  doc.moveDown(2);

  // PROJECT DETAILS SECTION
  doc.rect(50, doc.y, doc.page.width - 100, 20).fill('#f8fafc');
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#334155').text('1. PROJECT DETAILS', 60, doc.y + 5);
  doc.moveDown(2);

  const startY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569');
  doc.text('Project ID:', 50, startY);
  doc.text('Project Name:', 50, startY + 20);
  doc.text('State:', 50, startY + 40);
  doc.text('District:', 50, startY + 60);
  doc.text('Category:', 50, startY + 80);
  doc.text('Start Date:', 50, startY + 100);
  doc.text('Agency:', 50, startY + 120);

  doc.font('Helvetica').fillColor('#0f172a');
  doc.text(project.Project_ID || 'N/A', 150, startY);
  doc.text(project.Project_Name || 'N/A', 150, startY + 20);
  doc.text(project.State || 'N/A', 150, startY + 40);
  doc.text(project.District || 'N/A', 150, startY + 60);
  doc.text(project.Category || 'N/A', 150, startY + 80);
  doc.text(project.Start_Date || 'N/A', 150, startY + 100);
  doc.text(project.Implementing_Agency || 'N/A', 150, startY + 120);

  doc.moveDown(3);

  // FINANCIAL DETAILS SECTION
  doc.rect(50, doc.y, doc.page.width - 100, 20).fill('#f8fafc');
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#334155').text('2. FINANCIAL OVERVIEW', 60, doc.y + 5);
  doc.moveDown(2);

  const finY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569');
  doc.text('Sanctioned Amount:', 50, finY);
  doc.text('Actual Expenditure:', 50, finY + 20);
  doc.text('Financial Progress:', 50, finY + 40);
  doc.text('Physical Progress:', 50, finY + 60);

  doc.font('Helvetica').fillColor('#0f172a');
  doc.text(formatCurrency(project.Sanctioned_Amount), 180, finY);
  
  // Highlight if overrun
  if (project.Actual_Expenditure > project.Sanctioned_Amount) {
    doc.fillColor('#ef4444');
  }
  doc.text(formatCurrency(project.Actual_Expenditure), 180, finY + 20);
  
  doc.fillColor('#0f172a');
  doc.text(`${project.Financial_Progress || 0}%`, 180, finY + 40);
  doc.text(`${project.Physical_Progress || 0}%`, 180, finY + 60);

  doc.moveDown(3);

  // AI FINDINGS SECTION
  doc.rect(50, doc.y, doc.page.width - 100, 20).fill('#fef2f2'); // Light red bg
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#b91c1c').text('3. AI VERIFICATION FINDINGS', 60, doc.y + 5);
  doc.moveDown(2);

  if (project.risk && project.risk.risk_level) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#b91c1c').text(`Risk Level: ${project.risk.risk_level} (Score: ${project.risk.score}/100)`, 50, doc.y);
    doc.moveDown(1);

    doc.font('Helvetica-Bold').fillColor('#475569').text('Identified Anomalies:');
    doc.moveDown(0.5);
    
    doc.font('Helvetica').fillColor('#0f172a');
    if (project.risk.reasons && project.risk.reasons.length > 0) {
      project.risk.reasons.forEach(reason => {
        doc.text(`• ${reason}`, 60, doc.y, { width: doc.page.width - 120 });
        doc.moveDown(0.5);
      });
    } else {
      doc.text('No significant anomalies detected.', 60, doc.y);
    }
    
    doc.moveDown(1);
    doc.font('Helvetica-Bold').fillColor('#475569').text('AI Assessment:');
    doc.font('Helvetica').fillColor('#0f172a').text(project.risk.assessment || 'N/A', 60, doc.y + 5, { width: doc.page.width - 120 });
  } else {
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('#64748b').text('No AI findings available for this project.', 50, doc.y);
  }

  doc.moveDown(4);

  // FOOTER SIGNATURE
  const footerY = doc.y + 60;
  
  // Real signature image
  const signaturePath = path.join(__dirname, '../../frontend/public/signature.png');
  try {
    doc.image(signaturePath, doc.page.width - 250 + 25, footerY - 50, { width: 150 });
  } catch (e) {
    console.warn("Could not load signature for PDF", e);
    // Fallback to text if image not found
    doc.fontSize(28).font('Times-Italic').fillColor('#1e3a8a').text('District Nodal Auth', doc.page.width - 250, footerY - 30, { align: 'center', width: 200 });
  }
  
  doc.moveTo(doc.page.width - 250, footerY).lineTo(doc.page.width - 50, footerY).strokeColor('#cbd5e1').stroke();
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#334155').text('Authorized Signatory', doc.page.width - 250, footerY + 10, { align: 'center', width: 200 });
  doc.font('Helvetica').fillColor('#64748b').text('District Nodal Officer', doc.page.width - 250, footerY + 25, { align: 'center', width: 200 });
  doc.text(`Generated automatically on ${new Date().toLocaleDateString()}`, doc.page.width - 250, footerY + 40, { align: 'center', width: 200 });

  doc.end();
};

module.exports = {
  generateSanctionOrderPDF
};
