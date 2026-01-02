const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
// const authMiddleware = require('../middleware/auth'); // Temporarily disabled

// router.use(authMiddleware);

router.get('/', employeeController.getEmployeesByCompany);
router.get('/download-template', employeeController.downloadTemplate);
router.get('/:id', employeeController.getEmployeeById);
router.post('/', employeeController.createEmployee);
router.post('/bulk-upload', employeeController.bulkUploadEmployees);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;