const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
//const authMiddleware = require('../middleware/auth'); // Middleware to protect routes

// Apply authentication middleware to all routes in this file
//router.use(authMiddleware);

// GET /api/departments?companyId=1 - Get all departments for a specific company
router.get('/', departmentController.getDepartmentsByCompany);

// POST /api/departments - Create a new department
router.post('/', departmentController.createDepartment);

// PUT /api/departments/:id - Update a department
router.put('/:id', departmentController.updateDepartment);

// DELETE /api/departments/:id - Delete a department
router.delete('/:id', departmentController.deleteDepartment);

module.exports = router;