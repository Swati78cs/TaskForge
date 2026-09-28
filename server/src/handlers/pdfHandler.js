const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * generate_pdf handler
 * Payload: { title: string, content: string, author?: string }
 */
const generatePdfHandler = async (payload) => {
  const { title = 'TaskForge Document', content = 'TaskForge PDF content generated successfully.', author = 'TaskForge System' } = payload;

  const exportsDir = path.join(__dirname, '../../../exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  const filename = `document-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
  const filePath = path.join(exportsDir, filename);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Document styling & content
      doc.fontSize(24).fillColor('#1E293B').text('TaskForge PDF Generator', { align: 'center' });
      doc.moveDown(1);
      doc.fontSize(18).fillColor('#2563EB').text(title);
      doc.fontSize(10).fillColor('#64748B').text(`Author: ${author} | Date: ${new Date().toLocaleString()}`);
      doc.moveDown(1.5);
      doc.fontSize(12).fillColor('#0F172A').text(content, { align: 'justify', lineGap: 4 });

      doc.moveDown(2);
      doc.fontSize(10).fillColor('#94A3B8').text('--- Generated automatically by TaskForge Distributed Worker System ---', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        const stats = fs.statSync(filePath);
        resolve({
          status: 'GENERATED',
          filename,
          filePath,
          fileSizeBytes: stats.size,
          pages: 1,
          createdAt: new Date().toISOString(),
        });
      });

      writeStream.on('error', (err) => {
        reject(new Error(`PDFKit stream write error: ${err.message}`));
      });
    } catch (err) {
      reject(new Error(`PDF generation failed: ${err.message}`));
    }
  });
};

module.exports = generatePdfHandler;
