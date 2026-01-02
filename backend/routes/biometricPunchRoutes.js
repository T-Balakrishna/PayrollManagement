// Copy this ENTIRE file to: routes/attendanceRoutes.js

const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// If you have authentication middleware, uncomment and adjust:
// const { protect, authorize } = require('../middleware/authMiddleware');

// ============================================
// ATTENDANCE GENERATION ROUTES (Priority routes first)
// ============================================

// Generate attendance from biometric punches
// Body: { companyId, startDate, endDate, employeeIds? }
router.post('/generate', attendanceController.generateAttendance);

// ============================================
// SUMMARY & REPORTS (Before dynamic routes)
// ============================================

// Get attendance summary/statistics
// Query params: companyId, startDate, endDate, employeeId
router.get('/summary', attendanceController.getAttendanceSummary);

// ============================================
// APPROVAL ROUTES (Specific action routes)
// ============================================

// Approve attendance record
// Body: { userId }
router.patch('/:id/approve', attendanceController.approveAttendance);

// ============================================
// CRUD OPERATIONS
// ============================================

// Get all attendance records with filters (main endpoint for frontend table)
// Query params: companyId, startDate, endDate, employeeId, status, page, limit
router.get('/', attendanceController.getAttendance);

// Get single attendance record by ID (MUST BE LAST in GET routes)
router.get('/:id', attendanceController.getAttendanceById);

// Update attendance record
// Body: { status?, workingHours?, remarks?, isLate?, lateByMinutes?, ... }
router.put('/:id', attendanceController.updateAttendance);

// Delete attendance record
router.delete('/:id', attendanceController.deleteAttendance);

module.exports = router;