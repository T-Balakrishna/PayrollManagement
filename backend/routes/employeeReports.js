// routes/employeeReports.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const employeeReportsController = require('../controllers/employeeReportsController');

// ==========================================
// EMPLOYEE REPORTS ROUTES
// ==========================================

// 1. Employee Details Report
router.get('/employee-details', employeeReportsController.getEmployeeDetails);

// 2. Leave Balance Report
router.get('/leave-balance', employeeReportsController.getLeaveBalance);

// 3. Leave Taken Report
router.get('/leave-taken', employeeReportsController.getLeaveTaken);

// 4. Attendance Report
router.get('/attendance', employeeReportsController.getAttendanceReport);

// 5. Biometric Punch Report
router.get('/biometric', employeeReportsController.getBiometricReport);

// 6. Comprehensive Employee Report
router.get('/comprehensive', employeeReportsController.getComprehensiveReport);

// 7. Export Employee Details to PDF
router.get('/export/employee-details-pdf', employeeReportsController.exportEmployeeDetailsPDF);
router.get('/export/employee-details-excel', employeeReportsController.exportEmployeeDetailsExcel);
module.exports = router;