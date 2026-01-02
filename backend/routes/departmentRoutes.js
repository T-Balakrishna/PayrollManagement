
const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');

// Define routes and map to controller methods
router.route('/')
  .get(departmentController.getAllDepartments)
  .post(departmentController.createDepartment);

router.route('/:id')
  .put(departmentController.updateDepartment)
  .delete(departmentController.deleteDepartment);

module.exports = router;