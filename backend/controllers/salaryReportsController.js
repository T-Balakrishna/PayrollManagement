// controllers/salaryReportsController.js
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const db = require('../models');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const SalaryGeneration = db.SalaryGeneration;
const Employee = db.Employee;
const Department = db.Department;
const Company = db.Company;
const SalaryStructure = db.SalaryStructure;

// ==========================================
// 1. DETAILED SALARY REPORT (Company & Employment Type wise)
// ==========================================

exports.getSalaryReport = async (req, res) => {
  try {
    const { 
      companyId, 
      employmentType, 
      month, 
      year,
      page = 1,
      limit = 50 
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};
    if (companyId) whereClause.companyId = companyId;
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const employeeWhere = {};
    if (employmentType) employeeWhere.employmentType = employmentType;

    // Get salary data with pagination
    const { count, rows: salaryData } = await SalaryGeneration.findAndCountAll({
      where: {
        ...whereClause,
        status: 'paid' // Only include paid salaries
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'employmentType', 'bankAccountNumber', 'bankName', 'ifscCode'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName']
            }
          ]
        },
        {
          model: Company,
          as: 'company',
          attributes: ['companyName']
        }
      ],
      order: [
        [{ model: Employee, as: 'employee' }, { model: Department, as: 'department' }, 'departmentName', 'ASC'],
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate page total
    const pageTotal = salaryData.reduce((sum, record) => sum + parseFloat(record.netPay), 0);

    // Calculate grand total (all records)
    const grandTotal = await SalaryGeneration.sum('netPay', {
      where: {
        ...whereClause,
        status: 'paid'
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere
        }
      ]
    });

    // Get previous month comparison
    let previousMonth = parseInt(month) - 1;
    let previousYear = parseInt(year);
    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear -= 1;
    }

    const previousMonthTotal = await SalaryGeneration.sum('netPay', {
      where: {
        companyId: companyId || { [Op.ne]: null },
        month: previousMonth,
        year: previousYear,
        status: 'paid'
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere
        }
      ]
    }) || 0;

    const comparison = {
      currentMonth: grandTotal || 0,
      previousMonth: previousMonthTotal,
      difference: (grandTotal || 0) - previousMonthTotal,
      percentageChange: previousMonthTotal > 0 
        ? (((grandTotal || 0) - previousMonthTotal) / previousMonthTotal * 100).toFixed(2)
        : 0
    };

    // Group by department for better presentation
    const groupedByDepartment = {};
    salaryData.forEach(record => {
      const deptName = record.employee.department?.departmentName || 'Unassigned';
      if (!groupedByDepartment[deptName]) {
        groupedByDepartment[deptName] = [];
      }
      groupedByDepartment[deptName].push(record);
    });

    res.json({
      success: true,
      data: groupedByDepartment,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      summary: {
        pageTotal,
        grandTotal: grandTotal || 0,
        recordsCount: count,
        currentPageRecords: salaryData.length
      },
      comparison
    });

  } catch (error) {
    console.error('Get salary report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salary report',
      error: error.message
    });
  }
};

// ==========================================
// 2. DOWNLOAD SALARY REPORT AS PDF
// ==========================================

exports.downloadSalaryReportPDF = async (req, res) => {
  try {
    const { companyId, employmentType, month, year } = req.query;

    // Build where clause
    const whereClause = {};
    if (companyId) whereClause.companyId = companyId;
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const employeeWhere = {};
    if (employmentType) employeeWhere.employmentType = employmentType;

    // Get all salary data (no pagination for PDF)
    const salaryData = await SalaryGeneration.findAll({
      where: {
        ...whereClause,
        status: 'paid'
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName']
            }
          ]
        },
        {
          model: Company,
          as: 'company',
          attributes: ['companyName']
        }
      ],
      order: [
        [{ model: Employee, as: 'employee' }, { model: Department, as: 'department' }, 'departmentName', 'ASC'],
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']
      ]
    });

    // Group by department
    const groupedByDepartment = {};
    salaryData.forEach(record => {
      const deptName = record.employee.department?.departmentName || 'Unassigned';
      if (!groupedByDepartment[deptName]) {
        groupedByDepartment[deptName] = [];
      }
      groupedByDepartment[deptName].push(record);
    });

    // Calculate totals
    const grandTotal = salaryData.reduce((sum, record) => sum + parseFloat(record.netPay), 0);

    // Get previous month data
    let previousMonth = parseInt(month) - 1;
    let previousYear = parseInt(year);
    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear -= 1;
    }

    const previousMonthTotal = await SalaryGeneration.sum('netPay', {
      where: {
        companyId: companyId || { [Op.ne]: null },
        month: previousMonth,
        year: previousYear,
        status: 'paid'
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere
        }
      ]
    }) || 0;

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=salary-report-${month}-${year}.pdf`);
    
    doc.pipe(res);

    // Company info
    const companyName = salaryData[0]?.company?.companyName || 'Company Name';
    doc.fontSize(16).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Salary Report - ${getMonthName(month)} ${year}`, { align: 'center' });
    if (employmentType) {
      doc.fontSize(10).text(`Employment Type: ${employmentType}`, { align: 'center' });
    }
    doc.moveDown(0.5);

    // Table header styling
    const tableTop = doc.y;
    const colWidths = {
      sno: 30,
      empCode: 60,
      empName: 100,
      basic: 60,
      hra: 50,
      conveyance: 60,
      medical: 55,
      special: 60,
      gross: 65,
      pf: 45,
      esi: 40,
      tax: 45,
      netPay: 70
    };

    let yPosition = tableTop;
    let pageTotal = 0;
    let pageNumber = 1;
    let recordNumber = 1;

    // Function to draw table header
    const drawTableHeader = (isNewPage = false) => {
      if (isNewPage) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(9).font('Helvetica-Bold');
      let xPos = 30;
      
      doc.rect(xPos, yPosition, colWidths.sno, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('S.No', xPos + 5, yPosition + 6, { width: colWidths.sno - 10 });
      xPos += colWidths.sno;

      doc.rect(xPos, yPosition, colWidths.empCode, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Emp Code', xPos + 5, yPosition + 6, { width: colWidths.empCode - 10 });
      xPos += colWidths.empCode;

      doc.rect(xPos, yPosition, colWidths.empName, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Employee Name', xPos + 5, yPosition + 6, { width: colWidths.empName - 10 });
      xPos += colWidths.empName;

      doc.rect(xPos, yPosition, colWidths.basic, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Basic', xPos + 5, yPosition + 6, { width: colWidths.basic - 10 });
      xPos += colWidths.basic;

      doc.rect(xPos, yPosition, colWidths.hra, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('HRA', xPos + 5, yPosition + 6, { width: colWidths.hra - 10 });
      xPos += colWidths.hra;

      doc.rect(xPos, yPosition, colWidths.conveyance, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Convey', xPos + 5, yPosition + 6, { width: colWidths.conveyance - 10 });
      xPos += colWidths.conveyance;

      doc.rect(xPos, yPosition, colWidths.medical, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Medical', xPos + 5, yPosition + 6, { width: colWidths.medical - 10 });
      xPos += colWidths.medical;

      doc.rect(xPos, yPosition, colWidths.special, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Special', xPos + 5, yPosition + 6, { width: colWidths.special - 10 });
      xPos += colWidths.special;

      doc.rect(xPos, yPosition, colWidths.gross, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Gross', xPos + 5, yPosition + 6, { width: colWidths.gross - 10 });
      xPos += colWidths.gross;

      doc.rect(xPos, yPosition, colWidths.pf, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('PF', xPos + 5, yPosition + 6, { width: colWidths.pf - 10 });
      xPos += colWidths.pf;

      doc.rect(xPos, yPosition, colWidths.esi, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('ESI', xPos + 5, yPosition + 6, { width: colWidths.esi - 10 });
      xPos += colWidths.esi;

      doc.rect(xPos, yPosition, colWidths.tax, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Tax', xPos + 5, yPosition + 6, { width: colWidths.tax - 10 });
      xPos += colWidths.tax;

      doc.rect(xPos, yPosition, colWidths.netPay, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Net Pay', xPos + 5, yPosition + 6, { width: colWidths.netPay - 10 });

      yPosition += 20;
      doc.fillColor('black');
    };

    // Function to check if we need a new page
    const checkNewPage = () => {
      if (yPosition > 520) { // Leave space for page total and footer
        // Draw page total
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(`Page ${pageNumber} Total: ₹${pageTotal.toFixed(2)}`, 30, yPosition + 10, { align: 'right' });
        
        pageNumber++;
        pageTotal = 0;
        drawTableHeader(true);
      }
    };

    // Draw initial header
    drawTableHeader();

    // Draw department-wise data
    for (const [deptName, records] of Object.entries(groupedByDepartment)) {
      checkNewPage();

      // Department header
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#2C5282');
      doc.text(`Department: ${deptName}`, 30, yPosition + 5);
      yPosition += 20;

      // Draw records
      doc.fontSize(8).font('Helvetica');
      records.forEach(record => {
        checkNewPage();

        const earnings = record.earningsBreakdown || {};
        const deductions = record.deductionsBreakdown || {};
        
        let xPos = 30;
        const rowHeight = 18;

        // Alternate row colors
        if (recordNumber % 2 === 0) {
          doc.rect(xPos, yPosition, 792 - 60, rowHeight).fillAndStroke('#F7FAFC', '#E2E8F0');
        }

        doc.fillColor('black');

        // S.No
        doc.text(recordNumber, xPos + 5, yPosition + 5, { width: colWidths.sno - 10 });
        xPos += colWidths.sno;

        // Emp Code
        doc.text(record.employee.employeeCode, xPos + 5, yPosition + 5, { width: colWidths.empCode - 10 });
        xPos += colWidths.empCode;

        // Emp Name
        const fullName = `${record.employee.firstName} ${record.employee.lastName}`;
        doc.text(fullName, xPos + 5, yPosition + 5, { width: colWidths.empName - 10, ellipsis: true });
        xPos += colWidths.empName;

        // Basic
        doc.text((earnings.basicSalary || 0).toFixed(2), xPos + 5, yPosition + 5, { width: colWidths.basic - 10, align: 'right' });
        xPos += colWidths.basic;

        // HRA
        doc.text((earnings.hra || 0).toFixed(2), xPos + 5, yPosition + 5, { width: colWidths.hra - 10, align: 'right' });
        xPos += colWidths.hra;

        // Conveyance
        doc.text((earnings.conveyance || 0).toFixed(2), xPos + 5, yPosition + 5, { width: colWidths.conveyance - 10, align: 'right' });
        xPos += colWidths.conveyance;

        // Medical
        doc.text((earnings.medicalAllowance || 0).toFixed(2), xPos + 5, yPosition + 5, { width: colWidths.medical - 10, align: 'right' });
        xPos += colWidths.medical;

        // Special
        doc.text((earnings.specialAllowance || 0).toFixed(2), xPos + 5, yPosition + 5, { width: colWidths.special - 10, align: 'right' });
        xPos += colWidths.special;

        // Gross
        doc.text(parseFloat(record.grossPay).toFixed(2), xPos + 5, yPosition + 5, { width: colWidths.gross - 10, align: 'right' });
        xPos += colWidths.gross;

        // PF
        doc.text((deductions.providentFund || 0).toFixed(2), xPos + 5, yPosition + 5, { width: colWidths.pf - 10, align: 'right' });
        xPos += colWidths.pf;

        // ESI
        doc.text((deductions.esi || 0).toFixed(2), xPos + 5, yPosition + 5, { width: colWidths.esi - 10, align: 'right' });
        xPos += colWidths.esi;

        // Tax
        doc.text((deductions.incomeTax || 0).toFixed(2), xPos + 5, yPosition + 5, { width: colWidths.tax - 10, align: 'right' });
        xPos += colWidths.tax;

        // Net Pay
        doc.font('Helvetica-Bold').text(parseFloat(record.netPay).toFixed(2), xPos + 5, yPosition + 5, { width: colWidths.netPay - 10, align: 'right' });
        doc.font('Helvetica');

        yPosition += rowHeight;
        pageTotal += parseFloat(record.netPay);
        recordNumber++;
      });

      yPosition += 5; // Space after department
    }

    // Final page total
    if (pageTotal > 0) {
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Page ${pageNumber} Total: ₹${pageTotal.toFixed(2)}`, 30, yPosition + 10, { align: 'right' });
      yPosition += 30;
    }

    // Grand total and comparison
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2C5282');
    doc.text(`Grand Total: ₹${grandTotal.toFixed(2)}`, 30, yPosition + 10, { align: 'right' });
    
    yPosition += 30;
    doc.fontSize(10).fillColor('black');
    doc.text(`Previous Month (${getMonthName(previousMonth)} ${previousYear}): ₹${previousMonthTotal.toFixed(2)}`, 30, yPosition);
    yPosition += 15;
    
    const difference = grandTotal - previousMonthTotal;
    const percentageChange = previousMonthTotal > 0 ? ((difference / previousMonthTotal) * 100).toFixed(2) : 0;
    
    doc.fillColor(difference >= 0 ? '#22543D' : '#742A2A');
    doc.text(`Difference: ₹${difference.toFixed(2)} (${percentageChange}%)`, 30, yPosition);

    // Footer
    doc.fontSize(8).fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 30, yPosition + 40);
    doc.text(`Total Employees: ${salaryData.length}`, 30, yPosition + 55);

    doc.end();

  } catch (error) {
    console.error('Download salary report PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF',
      error: error.message
    });
  }
};

// ==========================================
// 3. DOWNLOAD SALARY REPORT AS EXCEL
// ==========================================

exports.downloadSalaryReportExcel = async (req, res) => {
  try {
    const { companyId, employmentType, month, year } = req.query;

    // Build where clause
    const whereClause = {};
    if (companyId) whereClause.companyId = companyId;
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const employeeWhere = {};
    if (employmentType) employeeWhere.employmentType = employmentType;

    // Get all salary data
    const salaryData = await SalaryGeneration.findAll({
      where: {
        ...whereClause,
        status: 'paid'
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          include: [
            {
              model: Department,
              as: 'department'
            }
          ]
        },
        {
          model: Company,
          as: 'company'
        }
      ],
      order: [
        [{ model: Employee, as: 'employee' }, { model: Department, as: 'department' }, 'departmentName', 'ASC'],
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']
      ]
    });

    // Group by department
    const groupedByDepartment = {};
    salaryData.forEach(record => {
      const deptName = record.employee.department?.departmentName || 'Unassigned';
      if (!groupedByDepartment[deptName]) {
        groupedByDepartment[deptName] = [];
      }
      groupedByDepartment[deptName].push(record);
    });

    // Calculate totals
    const grandTotal = salaryData.reduce((sum, record) => sum + parseFloat(record.netPay), 0);

    // Get previous month data
    let previousMonth = parseInt(month) - 1;
    let previousYear = parseInt(year);
    if (previousMonth === 0) {
      previousMonth = 12;
      previousYear -= 1;
    }

    const previousMonthTotal = await SalaryGeneration.sum('netPay', {
      where: {
        companyId: companyId || { [Op.ne]: null },
        month: previousMonth,
        year: previousYear,
        status: 'paid'
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere
        }
      ]
    }) || 0;

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Salary Report');

    // Company header
    const companyName = salaryData[0]?.company?.companyName || 'Company Name';
    worksheet.mergeCells('A1:N1');
    worksheet.getCell('A1').value = companyName;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:N2');
    worksheet.getCell('A2').value = `Salary Report - ${getMonthName(month)} ${year}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    if (employmentType) {
      worksheet.mergeCells('A3:N3');
      worksheet.getCell('A3').value = `Employment Type: ${employmentType}`;
      worksheet.getCell('A3').font = { size: 10 };
      worksheet.getCell('A3').alignment = { horizontal: 'center' };
    }

    // Table headers (row 5)
    const headerRow = worksheet.getRow(5);
    headerRow.values = [
      'S.No', 'Emp Code', 'Employee Name', 'Department', 
      'Basic', 'HRA', 'Conveyance', 'Medical', 'Special', 
      'Gross Pay', 'PF', 'ESI', 'Tax', 'Net Pay'
    ];
    
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A5568' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Set column widths
    worksheet.columns = [
      { key: 'sno', width: 8 },
      { key: 'empCode', width: 12 },
      { key: 'empName', width: 25 },
      { key: 'department', width: 20 },
      { key: 'basic', width: 12 },
      { key: 'hra', width: 12 },
      { key: 'conveyance', width: 12 },
      { key: 'medical', width: 12 },
      { key: 'special', width: 12 },
      { key: 'grossPay', width: 14 },
      { key: 'pf', width: 12 },
      { key: 'esi', width: 12 },
      { key: 'tax', width: 12 },
      { key: 'netPay', width: 14 }
    ];

    let rowNumber = 6;
    let recordNumber = 1;

    // Add data department-wise
    for (const [deptName, records] of Object.entries(groupedByDepartment)) {
      // Department header
      const deptRow = worksheet.getRow(rowNumber);
      worksheet.mergeCells(`A${rowNumber}:N${rowNumber}`);
      deptRow.getCell(1).value = `Department: ${deptName}`;
      deptRow.getCell(1).font = { bold: true, color: { argb: 'FF2C5282' } };
      deptRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F2FF' }
      };
      rowNumber++;

      // Add records
      records.forEach(record => {
        const earnings = record.earningsBreakdown || {};
        const deductions = record.deductionsBreakdown || {};
        
        const row = worksheet.getRow(rowNumber);
        row.values = [
          recordNumber,
          record.employee.employeeCode,
          `${record.employee.firstName} ${record.employee.lastName}`,
          deptName,
          parseFloat(earnings.basicSalary || 0),
          parseFloat(earnings.hra || 0),
          parseFloat(earnings.conveyance || 0),
          parseFloat(earnings.medicalAllowance || 0),
          parseFloat(earnings.specialAllowance || 0),
          parseFloat(record.grossPay),
          parseFloat(deductions.providentFund || 0),
          parseFloat(deductions.esi || 0),
          parseFloat(deductions.incomeTax || 0),
          parseFloat(record.netPay)
        ];

        // Format currency columns
        for (let col = 5; col <= 14; col++) {
          row.getCell(col).numFmt = '₹#,##0.00';
        }

        // Alternate row colors
        if (recordNumber % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7FAFC' }
          };
        }

        rowNumber++;
        recordNumber++;
      });

      rowNumber++; // Space after department
    }

    // Grand total
    rowNumber += 2;
    const totalRow = worksheet.getRow(rowNumber);
    worksheet.mergeCells(`A${rowNumber}:I${rowNumber}`);
    totalRow.getCell(1).value = 'Grand Total:';
    totalRow.getCell(1).font = { bold: true, size: 12 };
    totalRow.getCell(1).alignment = { horizontal: 'right' };
    totalRow.getCell(14).value = grandTotal;
    totalRow.getCell(14).numFmt = '₹#,##0.00';
    totalRow.getCell(14).font = { bold: true, size: 12 };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F2FF' }
    };

    // Comparison
    rowNumber += 2;
    worksheet.getCell(`A${rowNumber}`).value = `Previous Month (${getMonthName(previousMonth)} ${previousYear}):`;
    worksheet.getCell(`A${rowNumber}`).font = { bold: true };
    worksheet.getCell(`E${rowNumber}`).value = previousMonthTotal;
    worksheet.getCell(`E${rowNumber}`).numFmt = '₹#,##0.00';

    rowNumber++;
    const difference = grandTotal - previousMonthTotal;
    const percentageChange = previousMonthTotal > 0 ? ((difference / previousMonthTotal) * 100).toFixed(2) : 0;
    
    worksheet.getCell(`A${rowNumber}`).value = 'Difference:';
    worksheet.getCell(`A${rowNumber}`).font = { bold: true };
    worksheet.getCell(`E${rowNumber}`).value = `₹${difference.toFixed(2)} (${percentageChange}%)`;
    worksheet.getCell(`E${rowNumber}`).font = { 
      color: { argb: difference >= 0 ? 'FF22543D' : 'FF742A2A' } 
    };

    // Footer
    rowNumber += 2;
    worksheet.getCell(`A${rowNumber}`).value = `Generated on: ${new Date().toLocaleString()}`;
    worksheet.getCell(`A${rowNumber}`).font = { size: 9, color: { argb: 'FF808080' } };
    
    rowNumber++;
    worksheet.getCell(`A${rowNumber}`).value = `Total Employees: ${salaryData.length}`;
    worksheet.getCell(`A${rowNumber}`).font = { size: 9, color: { argb: 'FF808080' } };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=salary-report-${month}-${year}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Download salary report Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Excel',
      error: error.message
    });
  }
};

// ==========================================
// 4. BANK STATEMENT REPORT (Department-wise)
// ==========================================

exports.getBankStatement = async (req, res) => {
  try {
    const { companyId, month, year, departmentId } = req.query;

    const whereClause = {};
    if (companyId) whereClause.companyId = companyId;
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const bankData = await SalaryGeneration.findAll({
      where: {
        ...whereClause,
        status: 'paid'
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'bankAccountNumber', 'bankName', 'ifscCode'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName']
            }
          ]
        },
        {
          model: Company,
          as: 'company',
          attributes: ['companyName']
        }
      ],
      order: [
        [{ model: Employee, as: 'employee' }, { model: Department, as: 'department' }, 'departmentName', 'ASC'],
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']
      ]
    });

    // Group by department
    const groupedByDepartment = {};
    bankData.forEach(record => {
      const deptName = record.employee.department?.departmentName || 'Unassigned';
      if (!groupedByDepartment[deptName]) {
        groupedByDepartment[deptName] = {
          records: [],
          total: 0
        };
      }
      groupedByDepartment[deptName].records.push(record);
      groupedByDepartment[deptName].total += parseFloat(record.netPay);
    });

    const grandTotal = bankData.reduce((sum, record) => sum + parseFloat(record.netPay), 0);

    res.json({
      success: true,
      data: groupedByDepartment,
      summary: {
        grandTotal,
        totalEmployees: bankData.length,
        totalDepartments: Object.keys(groupedByDepartment).length
      }
    });

  } catch (error) {
    console.error('Get bank statement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank statement',
      error: error.message
    });
  }
};

// ==========================================
// 5. DOWNLOAD BANK STATEMENT AS PDF
// ==========================================

exports.downloadBankStatementPDF = async (req, res) => {
  try {
    const { companyId, month, year, departmentId } = req.query;

    const whereClause = {};
    if (companyId) whereClause.companyId = companyId;
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const bankData = await SalaryGeneration.findAll({
      where: {
        ...whereClause,
        status: 'paid'
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          include: [
            {
              model: Department,
              as: 'department'
            }
          ]
        },
        {
          model: Company,
          as: 'company'
        }
      ],
      order: [
        [{ model: Employee, as: 'employee' }, { model: Department, as: 'department' }, 'departmentName', 'ASC'],
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']
      ]
    });

    // Group by department
    const groupedByDepartment = {};
    bankData.forEach(record => {
      const deptName = record.employee.department?.departmentName || 'Unassigned';
      if (!groupedByDepartment[deptName]) {
        groupedByDepartment[deptName] = [];
      }
      groupedByDepartment[deptName].push(record);
    });

    const grandTotal = bankData.reduce((sum, record) => sum + parseFloat(record.netPay), 0);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=bank-statement-${month}-${year}.pdf`);
    
    doc.pipe(res);

    // Header
    const companyName = bankData[0]?.company?.companyName || 'Company Name';
    doc.fontSize(16).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Bank Statement - ${getMonthName(month)} ${year}`, { align: 'center' });
    doc.moveDown(1);

    let yPosition = doc.y;
    let recordNumber = 1;

    // Function to draw table header
    const drawTableHeader = () => {
      doc.fontSize(10).font('Helvetica-Bold');
      
      const headerY = yPosition;
      doc.rect(50, headerY, 50, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('S.No', 55, headerY + 6);
      
      doc.rect(100, headerY, 80, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Emp Code', 105, headerY + 6);
      
      doc.rect(180, headerY, 150, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Employee Name', 185, headerY + 6);
      
      doc.rect(330, headerY, 120, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Bank Account', 335, headerY + 6);
      
      doc.rect(450, headerY, 95, 20).fillAndStroke('#4A5568', '#2D3748');
      doc.fillColor('white').text('Net Pay', 455, headerY + 6);
      
      yPosition += 20;
      doc.fillColor('black');
    };

    // Draw data
    for (const [deptName, records] of Object.entries(groupedByDepartment)) {
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      // Department header
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#2C5282');
      doc.text(`Department: ${deptName}`, 50, yPosition);
      yPosition += 25;

      drawTableHeader();

      // Records
      doc.fontSize(9).font('Helvetica');
      let deptTotal = 0;

      records.forEach(record => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
          drawTableHeader();
        }

        const rowHeight = 18;
        
        if (recordNumber % 2 === 0) {
          doc.rect(50, yPosition, 495, rowHeight).fillAndStroke('#F7FAFC', '#E2E8F0');
        }

        doc.fillColor('black');
        
        doc.text(recordNumber, 55, yPosition + 5, { width: 40 });
        doc.text(record.employee.employeeCode, 105, yPosition + 5, { width: 70 });
        doc.text(`${record.employee.firstName} ${record.employee.lastName}`, 185, yPosition + 5, { width: 140, ellipsis: true });
        doc.text(record.employee.bankAccountNumber || 'N/A', 335, yPosition + 5, { width: 110 });
        doc.font('Helvetica-Bold').text(`₹${parseFloat(record.netPay).toFixed(2)}`, 455, yPosition + 5, { width: 85, align: 'right' });
        doc.font('Helvetica');

        yPosition += rowHeight;
        deptTotal += parseFloat(record.netPay);
        recordNumber++;
      });

      // Department total
      yPosition += 5;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Department Total: ₹${deptTotal.toFixed(2)}`, 450, yPosition, { align: 'right' });
      yPosition += 30;
    }

    // Grand total
    yPosition += 10;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#2C5282');
    doc.text(`Grand Total: ₹${grandTotal.toFixed(2)}`, 50, yPosition, { align: 'right' });

    // Footer
    yPosition += 40;
    doc.fontSize(8).fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, yPosition);
    doc.text(`Total Employees: ${bankData.length}`, 50, yPosition + 15);

    doc.end();

  } catch (error) {
    console.error('Download bank statement PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate bank statement PDF',
      error: error.message
    });
  }
};

// ==========================================
// 6. DOWNLOAD BANK STATEMENT AS EXCEL
// ==========================================

exports.downloadBankStatementExcel = async (req, res) => {
  try {
    const { companyId, month, year, departmentId } = req.query;

    const whereClause = {};
    if (companyId) whereClause.companyId = companyId;
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const bankData = await SalaryGeneration.findAll({
      where: {
        ...whereClause,
        status: 'paid'
      },
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          include: [
            {
              model: Department,
              as: 'department'
            }
          ]
        },
        {
          model: Company,
          as: 'company'
        }
      ],
      order: [
        [{ model: Employee, as: 'employee' }, { model: Department, as: 'department' }, 'departmentName', 'ASC'],
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']
      ]
    });

    // Group by department
    const groupedByDepartment = {};
    bankData.forEach(record => {
      const deptName = record.employee.department?.departmentName || 'Unassigned';
      if (!groupedByDepartment[deptName]) {
        groupedByDepartment[deptName] = [];
      }
      groupedByDepartment[deptName].push(record);
    });

    const grandTotal = bankData.reduce((sum, record) => sum + parseFloat(record.netPay), 0);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bank Statement');

    // Header
    const companyName = bankData[0]?.company?.companyName || 'Company Name';
    worksheet.mergeCells('A1:E1');
    worksheet.getCell('A1').value = companyName;
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = `Bank Statement - ${getMonthName(month)} ${year}`;
    worksheet.getCell('A2').font = { size: 12 };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    // Table header
    const headerRow = worksheet.getRow(4);
    headerRow.values = ['S.No', 'Emp Code', 'Employee Name', 'Bank Account', 'Net Pay'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A5568' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.columns = [
      { key: 'sno', width: 8 },
      { key: 'empCode', width: 15 },
      { key: 'empName', width: 30 },
      { key: 'bankAccount', width: 20 },
      { key: 'netPay', width: 15 }
    ];

    let rowNumber = 5;
    let recordNumber = 1;

    // Add data
    for (const [deptName, records] of Object.entries(groupedByDepartment)) {
      // Department header
      const deptRow = worksheet.getRow(rowNumber);
      worksheet.mergeCells(`A${rowNumber}:E${rowNumber}`);
      deptRow.getCell(1).value = `Department: ${deptName}`;
      deptRow.getCell(1).font = { bold: true, color: { argb: 'FF2C5282' } };
      deptRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F2FF' }
      };
      rowNumber++;

      let deptTotal = 0;

      records.forEach(record => {
        const row = worksheet.getRow(rowNumber);
        row.values = [
          recordNumber,
          record.employee.employeeCode,
          `${record.employee.firstName} ${record.employee.lastName}`,
          record.employee.bankAccountNumber || 'N/A',
          parseFloat(record.netPay)
        ];

        row.getCell(5).numFmt = '₹#,##0.00';

        if (recordNumber % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7FAFC' }
          };
        }

        deptTotal += parseFloat(record.netPay);
        rowNumber++;
        recordNumber++;
      });

      // Department total
      const totalRow = worksheet.getRow(rowNumber);
      worksheet.mergeCells(`A${rowNumber}:D${rowNumber}`);
      totalRow.getCell(1).value = 'Department Total:';
      totalRow.getCell(1).font = { bold: true };
      totalRow.getCell(1).alignment = { horizontal: 'right' };
      totalRow.getCell(5).value = deptTotal;
      totalRow.getCell(5).numFmt = '₹#,##0.00';
      totalRow.getCell(5).font = { bold: true };
      totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE6E6' }
      };
      rowNumber += 2;
    }

    // Grand total
    rowNumber++;
    const grandTotalRow = worksheet.getRow(rowNumber);
    worksheet.mergeCells(`A${rowNumber}:D${rowNumber}`);
    grandTotalRow.getCell(1).value = 'Grand Total:';
    grandTotalRow.getCell(1).font = { bold: true, size: 12 };
    grandTotalRow.getCell(1).alignment = { horizontal: 'right' };
    grandTotalRow.getCell(5).value = grandTotal;
    grandTotalRow.getCell(5).numFmt = '₹#,##0.00';
    grandTotalRow.getCell(5).font = { bold: true, size: 12 };
    grandTotalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F2FF' }
    };

    // Footer
    rowNumber += 2;
    worksheet.getCell(`A${rowNumber}`).value = `Generated on: ${new Date().toLocaleString()}`;
    worksheet.getCell(`A${rowNumber}`).font = { size: 9, color: { argb: 'FF808080' } };
    
    rowNumber++;
    worksheet.getCell(`A${rowNumber}`).value = `Total Employees: ${bankData.length}`;
    worksheet.getCell(`A${rowNumber}`).font = { size: 9, color: { argb: 'FF808080' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=bank-statement-${month}-${year}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Download bank statement Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate bank statement Excel',
      error: error.message
    });
  }
};

// ==========================================
// 7. DOWNLOAD INDIVIDUAL PAYSLIP
// ==========================================

exports.downloadPayslip = async (req, res) => {
  try {
    const { salaryGenerationId } = req.params;

    const salaryRecord = await SalaryGeneration.findOne({
      where: { id: salaryGenerationId },
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            {
              model: Department,
              as: 'department'
            }
          ]
        },
        {
          model: Company,
          as: 'company'
        }
      ]
    });

    if (!salaryRecord) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=payslip-${salaryRecord.employee.employeeCode}-${salaryRecord.month}-${salaryRecord.year}.pdf`);
    
    doc.pipe(res);

    // Company Header
    doc.fontSize(18).font('Helvetica-Bold').text(salaryRecord.company.companyName, { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Salary Slip', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(9).text(`For the month of ${getMonthName(salaryRecord.month)} ${salaryRecord.year}`, { align: 'center' });
    
    // Horizontal line
    doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).stroke();
    doc.moveDown(1);

    // Employee Details Box
    const startY = doc.y;
    doc.rect(50, startY, 245, 100).stroke();
    doc.rect(295, startY, 250, 100).stroke();

    // Left side - Employee Info
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Employee Details', 60, startY + 10);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Name: ${salaryRecord.employee.firstName} ${salaryRecord.employee.lastName}`, 60, startY + 30);
    doc.text(`Emp Code: ${salaryRecord.employee.employeeCode}`, 60, startY + 45);
    doc.text(`Department: ${salaryRecord.employee.department?.departmentName || 'N/A'}`, 60, startY + 60);
    doc.text(`Employment Type: ${salaryRecord.employee.employmentType}`, 60, startY + 75);

    // Right side - Payment Info
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Payment Details', 305, startY + 10);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Pay Period: ${getMonthName(salaryRecord.month)} ${salaryRecord.year}`, 305, startY + 30);
    doc.text(`Payment Date: ${salaryRecord.paymentDate ? new Date(salaryRecord.paymentDate).toLocaleDateString() : 'N/A'}`, 305, startY + 45);
    doc.text(`Working Days: ${salaryRecord.workingDays}`, 305, startY + 60);
    doc.text(`Present Days: ${salaryRecord.presentDays}`, 305, startY + 75);

    doc.moveDown(3);

    // Earnings and Deductions Table
    const tableTop = doc.y;
    
    // Table headers
    doc.fontSize(10).font('Helvetica-Bold');
    doc.rect(50, tableTop, 245, 25).fillAndStroke('#4A5568', '#2D3748');
    doc.rect(295, tableTop, 250, 25).fillAndStroke('#4A5568', '#2D3748');
    
    doc.fillColor('white').text('EARNINGS', 60, tableTop + 8);
    doc.text('AMOUNT', 220, tableTop + 8);
    doc.text('DEDUCTIONS', 305, tableTop + 8);
    doc.text('AMOUNT', 470, tableTop + 8);
    
    doc.fillColor('black');

    let yPos = tableTop + 25;
    const earnings = salaryRecord.earningsBreakdown || {};
    const deductions = salaryRecord.deductionsBreakdown || {};

    // Earnings items
    const earningsItems = [
      { label: 'Basic Salary', value: earnings.basicSalary || 0 },
      { label: 'HRA', value: earnings.hra || 0 },
      { label: 'Conveyance', value: earnings.conveyance || 0 },
      { label: 'Medical Allowance', value: earnings.medicalAllowance || 0 },
      { label: 'Special Allowance', value: earnings.specialAllowance || 0 },
      { label: 'Overtime Pay', value: earnings.overtimePay || 0 }
    ];

    const deductionsItems = [
      { label: 'Provident Fund', value: deductions.providentFund || 0 },
      { label: 'ESI', value: deductions.esi || 0 },
      { label: 'Income Tax', value: deductions.incomeTax || 0 },
      { label: 'Professional Tax', value: deductions.professionalTax || 0 },
      { label: 'Late Deduction', value: deductions.lateDeduction || 0 },
      { label: 'Absent Deduction', value: deductions.absentDeduction || 0 },
      { label: 'Leave Deduction', value: deductions.leaveDeduction || 0 },
      { label: 'Other Deductions', value: deductions.otherDeductions || 0 }
    ];

    const maxRows = Math.max(earningsItems.length, deductionsItems.length);

    doc.fontSize(9).font('Helvetica');

    for (let i = 0; i < maxRows; i++) {
      const rowHeight = 20;
      
      // Alternate row background
      if (i % 2 === 0) {
        doc.rect(50, yPos, 245, rowHeight).fillAndStroke('#F7FAFC', '#E2E8F0');
        doc.rect(295, yPos, 250, rowHeight).fillAndStroke('#F7FAFC', '#E2E8F0');
      } else {
        doc.rect(50, yPos, 245, rowHeight).stroke();
        doc.rect(295, yPos, 250, rowHeight).stroke();
      }

      doc.fillColor('black');

      // Earnings
      if (i < earningsItems.length) {
        doc.text(earningsItems[i].label, 60, yPos + 5);
        doc.text(`₹${earningsItems[i].value.toFixed(2)}`, 220, yPos + 5, { width: 65, align: 'right' });
      }

      // Deductions
      if (i < deductionsItems.length) {
        doc.text(deductionsItems[i].label, 305, yPos + 5);
        doc.text(`₹${deductionsItems[i].value.toFixed(2)}`, 470, yPos + 5, { width: 65, align: 'right' });
      }

      yPos += rowHeight;
    }

    // Totals row
    doc.fontSize(10).font('Helvetica-Bold');
    doc.rect(50, yPos, 245, 25).fillAndStroke('#E6F2FF', '#2D3748');
    doc.rect(295, yPos, 250, 25).fillAndStroke('#FFE6E6', '#2D3748');
    
    doc.fillColor('black').text('GROSS EARNINGS', 60, yPos + 8);
    doc.text(`₹${parseFloat(salaryRecord.grossPay).toFixed(2)}`, 220, yPos + 8, { width: 65, align: 'right' });
    
    doc.text('TOTAL DEDUCTIONS', 305, yPos + 8);
    doc.text(`₹${parseFloat(salaryRecord.totalDeductions).toFixed(2)}`, 470, yPos + 8, { width: 65, align: 'right' });

    // Net Pay
    yPos += 40;
    doc.fontSize(14).font('Helvetica-Bold');
    doc.fillColor('#2C5282');
    doc.text('NET PAY:', 50, yPos);
    doc.fillColor('#22543D');
    doc.text(`₹${parseFloat(salaryRecord.netPay).toFixed(2)}`, 200, yPos, { align: 'right' });

    // Net pay in words
    yPos += 25;
    doc.fontSize(9).font('Helvetica').fillColor('black');
    doc.text(`(${numberToWords(salaryRecord.netPay)} only)`, 50, yPos, { align: 'center' });

    // Footer
    yPos += 40;
    doc.fontSize(8).fillColor('gray');
    doc.text('This is a computer-generated payslip and does not require a signature.', 50, yPos, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 50, yPos + 15, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Download payslip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payslip',
      error: error.message
    });
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[parseInt(month) - 1];
}

function numberToWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertLessThanThousand(num) {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertLessThanThousand(num % 100) : '');
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let result = '';
  
  if (rupees === 0) {
    result = 'Zero Rupees';
  } else {
    const crores = Math.floor(rupees / 10000000);
    const lakhs = Math.floor((rupees % 10000000) / 100000);
    const thousands = Math.floor((rupees % 100000) / 1000);
    const remainder = rupees % 1000;

    if (crores) result += convertLessThanThousand(crores) + ' Crore ';
    if (lakhs) result += convertLessThanThousand(lakhs) + ' Lakh ';
    if (thousands) result += convertLessThanThousand(thousands) + ' Thousand ';
    if (remainder) result += convertLessThanThousand(remainder);
    
    result += ' Rupees';
  }

  if (paise > 0) {
    result += ' and ' + convertLessThanThousand(paise) + ' Paise';
  }

  return result.trim();
}

module.exports = exports;
