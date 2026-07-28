const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Define file paths
const artifactDir =
  'C:/Users/CUAPDC03/.gemini/antigravity-ide/brain/0489db98-4e7c-4b20-83ff-ab4d5ae852e1';
const limitationsMdPath = path.join(artifactDir, 'application_limitations_audit.md');
const architectureMdPath = path.join(artifactDir, 'software_architecture_report.md');

const limitationsPdfPath = path.join(artifactDir, 'application_limitations_audit.pdf');
const architecturePdfPath = path.join(artifactDir, 'software_architecture_report.pdf');

function compileMarkdownToPdf(mdPath, pdfPath, docTitle) {
  if (!fs.existsSync(mdPath)) {
    console.error(`Source markdown file not found: ${mdPath}`);
    return;
  }

  console.log(`Compiling ${mdPath} to ${pdfPath}...`);
  const mdContent = fs.readFileSync(mdPath, 'utf-8');
  const lines = mdContent.split(/\r?\n/);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const writeStream = fs.createWriteStream(pdfPath);
  doc.pipe(writeStream);

  // Setup header
  doc
    .fillColor('#1e3a8a')
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('WCCMS TECHNICAL REPORT', { align: 'center' });

  doc
    .fillColor('#475569')
    .fontSize(10)
    .font('Helvetica')
    .text('Student Wellness Counseling Centre - CUAP', { align: 'center' });

  doc.moveDown(1);
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1.5);

  let inCodeBlock = false;
  let codeBlockLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle page breaks proactively
    if (doc.y > 720) {
      doc.addPage();
      // Render page header on new pages
      doc
        .fillColor('#94a3b8')
        .fontSize(8)
        .font('Helvetica')
        .text('WCCMS System Audit & Analysis', 50, 30);
      doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(50, 42).lineTo(545, 42).stroke();
      doc.y = 60;
    }

    // Code block check
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        inCodeBlock = false;
        doc.fillColor('#1e293b').font('Courier').fontSize(8.5);

        const codeText = codeBlockLines.join('\n');
        const textHeight = doc.heightOfString(codeText, { width: 475 });

        // Draw light background rect for code block
        const rectY = doc.y;
        doc
          .rect(50, rectY, 495, textHeight + 10)
          .fillColor('#f8fafc')
          .fill();

        doc.fillColor('#0f172a');
        doc.text(codeText, 60, rectY + 5, { width: 475, lineGap: 2 });
        doc.y = rectY + textHeight + 15;
        codeBlockLines = [];
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Skip empty lines
    if (line.trim() === '') {
      doc.moveDown(0.5);
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---') {
      doc.moveDown(0.5);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1.0);
      continue;
    }

    // H1 Heading
    if (line.startsWith('# ')) {
      const heading = line.substring(2).trim();
      doc
        .fillColor('#1e3a8a')
        .font('Helvetica-Bold')
        .fontSize(18)
        .text(heading, { paragraphGap: 10 });
      continue;
    }

    // H2 Heading
    if (line.startsWith('## ')) {
      const heading = line.substring(3).trim();
      doc
        .fillColor('#1e3a8a')
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(heading, { paragraphGap: 8 });
      continue;
    }

    // H3 Heading
    if (line.startsWith('### ')) {
      const heading = line.substring(4).trim();
      doc
        .fillColor('#0f172a')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(heading, { paragraphGap: 6 });
      continue;
    }

    // List item (nested or regular)
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const isNested = line.startsWith('  ') || line.startsWith('\t');
      const cleanLine = line.replace(/^\s*[\*\-]\s+/, '').trim();

      // Basic bold extraction in lists, e.g. **Bold**: text
      const boldParts = cleanLine.split('**');
      const startX = isNested ? 75 : 60;
      const bulletSymbol = isNested ? 'o' : '•';

      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(9.5)
        .text(bulletSymbol, startX - 10, doc.y, { continued: false });

      let currentY = doc.y;

      if (boldParts.length >= 3) {
        doc
          .font('Helvetica-Bold')
          .fillColor('#1e293b')
          .text(boldParts[1], startX, currentY - 11, { continued: true });

        doc
          .font('Helvetica')
          .fillColor('#475569')
          .text(boldParts.slice(2).join('**'), { paragraphGap: 4 });
      } else {
        doc
          .font('Helvetica')
          .fillColor('#475569')
          .text(cleanLine, startX, currentY - 11, { paragraphGap: 4 });
      }
      continue;
    }

    // Check for table rows (simple parser)
    if (line.trim().startsWith('|')) {
      const cells = line
        .split('|')
        .map((c) => c.trim())
        .filter((c) => c !== '');
      // Check if it is a separator line like |---|---|
      if (cells.every((c) => c.startsWith('-'))) {
        continue;
      }

      const colWidth = Math.floor(495 / cells.length);
      const startX = 50;
      const startY = doc.y;

      // Calculate row height based on cell content heights
      doc.fontSize(8.5).font('Helvetica');
      let maxCellHeight = 12;
      for (let j = 0; j < cells.length; j++) {
        const h = doc.heightOfString(cells[j], { width: colWidth - 10 });
        if (h > maxCellHeight) maxCellHeight = h;
      }

      // Draw cell text
      for (let j = 0; j < cells.length; j++) {
        doc
          .rect(startX + j * colWidth, startY, colWidth, maxCellHeight + 4)
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .stroke();

        doc
          .fillColor('#334155')
          .text(cells[j], startX + j * colWidth + 5, startY + 2, { width: colWidth - 10 });
      }
      doc.y = startY + maxCellHeight + 8;
      continue;
    }

    // Normal Text Paragraph
    // Basic inline bold parsing: text **bold** text
    let cleanText = line.trim();

    // Replace markdown link formatting with link text only
    cleanText = cleanText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    const boldParts = cleanText.split('**');
    if (boldParts.length >= 3) {
      doc.font('Helvetica').fontSize(9.5).fillColor('#334155');

      let nextContinued = true;
      for (let k = 0; k < boldParts.length; k++) {
        const isBold = k % 2 === 1;
        const textSegment = boldParts[k];

        if (isBold) {
          doc.font('Helvetica-Bold').fillColor('#0f172a');
        } else {
          doc.font('Helvetica').fillColor('#334155');
        }

        doc.text(textSegment, { continued: k < boldParts.length - 1 });
      }
      doc.moveDown(0.6);
    } else {
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor('#334155')
        .text(cleanText, { align: 'justify', paragraphGap: 6, lineGap: 1.5 });
    }
  }

  doc.end();
  writeStream.on('finish', () => {
    console.log(`Successfully generated PDF: ${pdfPath}`);
  });
}

// Compile both reports
compileMarkdownToPdf(limitationsMdPath, limitationsPdfPath, 'Technical Limitations Audit');
compileMarkdownToPdf(architectureMdPath, architecturePdfPath, 'Software Architecture Report');
