const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { formatDate, calcPercentage } = require('../utils/helpers');

/**
 * Export Service — Generates PDF and Excel attendance reports.
 */

/**
 * Generate an attendance report PDF for a session.
 * @param {object} session - Session document (populated)
 * @param {Array} attendanceList - Attendance records (populated with student)
 * @param {object} course - Course document
 * @param {object} faculty - Faculty user document
 * @returns {Buffer} PDF buffer
 */
const generateAttendancePdf = (session, attendanceList, course, faculty) => {
  return new Promise((resolve, reject) => {
    const buffers = [];
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Attendance Report — ${session.title}`,
        Author: faculty.name,
        Subject: `Attendance for ${course.name}`,
        Keywords: 'attendance, QRCodeAttend, report',
      },
    });

    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // === HEADER ===
    doc
      .rect(0, 0, doc.page.width, 120)
      .fill('#1e1b4b');

    doc
      .fillColor('#ffffff')
      .fontSize(26)
      .font('Helvetica-Bold')
      .text('QRCodeAttend', 50, 30);

    doc
      .fontSize(12)
      .font('Helvetica')
      .text('Attendance Management System', 50, 60);

    doc
      .fontSize(10)
      .text(`Generated: ${formatDate(new Date())}`, 50, 80, { align: 'right' });

    // === REPORT TITLE ===
    doc.fillColor('#1e293b').fontSize(18).font('Helvetica-Bold').text('Attendance Report', 50, 140);
    doc.moveTo(50, 165).lineTo(545, 165).stroke('#6366f1');

    // === SESSION INFO ===
    doc.moveDown(0.5);
    const infoY = 175;
    doc.fillColor('#374151').fontSize(11).font('Helvetica-Bold');

    const fields = [
      ['Session:', session.title],
      ['Course:', `${course.name} (${course.code})`],
      ['Faculty:', faculty.name],
      ['Date:', formatDate(session.startedAt || session.scheduledAt)],
      ['Duration:', session.durationMinutes ? `${session.durationMinutes} minutes` : 'N/A'],
      ['Status:', session.status.toUpperCase()],
    ];

    fields.forEach(([label, value], i) => {
      const x = i % 2 === 0 ? 50 : 300;
      const y = infoY + Math.floor(i / 2) * 22;
      doc.font('Helvetica-Bold').fillColor('#6366f1').text(label, x, y, { continued: true });
      doc.font('Helvetica').fillColor('#1e293b').text(` ${value}`);
    });

    // === SUMMARY BOX ===
    const summaryY = infoY + Math.ceil(fields.length / 2) * 22 + 15;
    const presentCount = attendanceList.filter((a) => a.status === 'present').length;
    const lateCount = attendanceList.filter((a) => a.status === 'late').length;
    const absentCount = session.totalStudents - attendanceList.length;
    const rate = calcPercentage(presentCount + lateCount, session.totalStudents);

    doc.rect(50, summaryY, 495, 60).fill('#f0f0ff');
    doc.fillColor('#6366f1').fontSize(13).font('Helvetica-Bold');
    doc.text(`Total Enrolled: ${session.totalStudents}`, 70, summaryY + 10, { continued: true });
    doc.fillColor('#16a34a').text(`   Present: ${presentCount}`, { continued: true });
    doc.fillColor('#f59e0b').text(`   Late: ${lateCount}`, { continued: true });
    doc.fillColor('#dc2626').text(`   Absent: ${absentCount}`, { continued: true });
    doc.fillColor('#6366f1').text(`   Rate: ${rate}%`);

    // === TABLE ===
    const tableY = summaryY + 80;
    const colWidths = [35, 180, 90, 80, 80, 55];
    const headers = ['#', 'Student Name', 'Enrollment No.', 'Marked At', 'Status', 'Verified'];

    // Table header
    doc.rect(50, tableY, 495, 25).fill('#1e1b4b');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    let xPos = 55;
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableY + 8, { width: colWidths[i] - 5 });
      xPos += colWidths[i];
    });

    // Table rows
    doc.fontSize(9).font('Helvetica');
    attendanceList.forEach((record, idx) => {
      const rowY = tableY + 25 + idx * 22;

      // Alternate row background
      if (idx % 2 === 0) {
        doc.rect(50, rowY, 495, 22).fill('#f8fafc');
      }

      doc.fillColor('#374151');
      xPos = 55;
      const cells = [
        String(idx + 1),
        record.studentId?.name || 'Unknown',
        record.studentId?.enrollmentNumber || '—',
        record.markedAt ? formatDate(record.markedAt) : '—',
        record.status.toUpperCase(),
        record.isVerified ? '✓' : '✗',
      ];

      // Color status column
      cells.forEach((cell, i) => {
        if (i === 4) {
          const color =
            record.status === 'present' ? '#16a34a' :
            record.status === 'late' ? '#f59e0b' :
            '#dc2626';
          doc.fillColor(color).font('Helvetica-Bold');
        } else {
          doc.fillColor('#374151').font('Helvetica');
        }
        doc.text(cell, xPos, rowY + 6, { width: colWidths[i] - 5 });
        xPos += colWidths[i];
      });
    });

    // === FOOTER ===
    doc
      .fillColor('#9ca3af')
      .fontSize(8)
      .text(
        'Generated by QRCodeAttend — Dynamic Proxy-Free Attendance System',
        50,
        doc.page.height - 40,
        { align: 'center', width: 495 }
      );

    doc.end();
  });
};

/**
 * Generate an Excel attendance report.
 * @param {object} session - Session document
 * @param {Array} attendanceList - Attendance records
 * @param {object} course - Course document
 * @param {object} faculty - Faculty user document
 * @returns {Buffer} Excel buffer
 */
const generateAttendanceExcel = async (session, attendanceList, course, faculty) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QRCodeAttend';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Attendance Report', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  // Set column widths
  sheet.columns = [
    { header: '#', key: 'index', width: 6 },
    { header: 'Student Name', key: 'name', width: 30 },
    { header: 'Enrollment No.', key: 'enrollment', width: 20 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Marked At', key: 'markedAt', width: 22 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Distance (m)', key: 'distance', width: 14 },
    { header: 'Verified', key: 'verified', width: 10 },
    { header: 'Method', key: 'method', width: 14 },
  ];

  // Title rows
  sheet.mergeCells('A1:I1');
  sheet.getCell('A1').value = 'QRCodeAttend — Attendance Report';
  sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF6366F1' } };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:I2');
  sheet.getCell('A2').value = `Session: ${session.title} | Course: ${course.name} (${course.code}) | Faculty: ${faculty.name}`;
  sheet.getCell('A2').font = { size: 11 };
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  sheet.mergeCells('A3:I3');
  sheet.getCell('A3').value = `Date: ${formatDate(session.scheduledAt)} | Total Enrolled: ${session.totalStudents} | Present: ${session.presentCount} | Rate: ${calcPercentage(session.presentCount, session.totalStudents)}%`;
  sheet.getCell('A3').font = { size: 10, color: { argb: 'FF374151' } };
  sheet.getCell('A3').alignment = { horizontal: 'center' };

  sheet.addRow([]); // spacer

  // Style header row (row 5)
  const headerRow = sheet.getRow(5);
  headerRow.values = ['#', 'Student Name', 'Enrollment No.', 'Email', 'Marked At', 'Status', 'Distance (m)', 'Verified', 'Method'];
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF6366F1' } },
    };
  });
  headerRow.height = 25;

  // Data rows
  attendanceList.forEach((record, idx) => {
    const row = sheet.addRow({
      index: idx + 1,
      name: record.studentId?.name || 'Unknown',
      enrollment: record.studentId?.enrollmentNumber || '—',
      email: record.studentId?.email || '—',
      markedAt: record.markedAt ? formatDate(record.markedAt) : '—',
      status: record.status.toUpperCase(),
      distance: record.geoLocation?.distanceFromSession ?? '—',
      verified: record.isVerified ? 'Yes' : 'No',
      method: record.verificationMethod || '—',
    });

    // Color status cell
    const statusCell = row.getCell('status');
    const statusColor =
      record.status === 'present' ? 'FF16A34A' :
      record.status === 'late' ? 'FFF59E0B' :
      record.status === 'excused' ? 'FF6366F1' :
      'FFDC2626';
    statusCell.font = { bold: true, color: { argb: statusColor } };

    // Alternate row fill
    if (idx % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }

    row.eachCell((cell) => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5 + attendanceList.length, column: 9 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = { generateAttendancePdf, generateAttendanceExcel };
