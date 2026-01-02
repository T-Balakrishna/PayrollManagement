// routes/attendanceRoutes.js
// Copy this file to: backend/routes/attendanceRoutes.js
// This version matches your attendanceController.js function names

const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// IMPORTANT: Routes order matters! 
// More specific routes (like /generate, /summary) MUST come BEFORE /:id

// @route   POST /api/attendance/generate
// @desc    Generate attendance for a date range
// @access  Private
router.post('/generate', attendanceController.generateAttendance);

// @route   GET /api/attendance/summary
// @desc    Get attendance summary/statistics
// @access  Private
router.get('/summary', attendanceController.getAttendanceSummary);

// @route   GET /api/attendance/:id
// @desc    Get attendance by ID
// @access  Private
router.get('/:id', attendanceController.getAttendanceById);

// @route   PATCH /api/attendance/:id/approve
// @desc    Approve attendance
// @access  Private
router.patch('/:id/approve', attendanceController.approveAttendance);

// @route   PUT /api/attendance/:id
// @desc    Update attendance record
// @access  Private
router.put('/:id', attendanceController.updateAttendance);

// @route   DELETE /api/attendance/:id
// @desc    Delete attendance record
// @access  Private
router.delete('/:id', attendanceController.deleteAttendance);

// @route   GET /api/attendance
// @desc    Get all attendance records with filters and pagination
// @access  Private
// IMPORTANT: This MUST be LAST because it's the catch-all route
router.get('/', attendanceController.getAttendance);

module.exports = router;
