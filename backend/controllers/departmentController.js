const { Department, Company } = require('../models');

// @desc    Get all departments for a specific company
// @route   GET /api/departments?companyId=1
// @access  Private
exports.getDepartmentsByCompany = async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    try {
        const departments = await Department.findAll({
            where: { companyId },
            include: [{ 
                model: Company, 
                as: 'company', // <-- ADD THIS ALIAS (singular, as it's the belongsTo side)
                attributes: ['name'] 
            }]
        });
        res.status(200).json(departments);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private
exports.createDepartment = async (req, res) => {
    const { name, acronym, status, companyId } = req.body;

    if (!name || !acronym || !companyId) {
        return res.status(400).json({ message: 'Missing required fields: name, acronym, or companyId' });
    }

    try {
        const newDepartment = await Department.create({
            name,
            acronym,
            status,
            companyId,
        });
        res.status(201).json(newDepartment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Private
exports.updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { name, acronym, status, companyId } = req.body;

    try {
        const department = await Department.findByPk(id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        // Optional: Add a check to ensure the user can only update departments of their company
        // if (department.companyId !== req.user.companyId) {
        //   return res.status(403).json({ message: 'Forbidden' });
        // }

        await department.update({ name, acronym, status, companyId });
        res.status(200).json(department);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Private
exports.deleteDepartment = async (req, res) => {
    const { id } = req.params;

    try {
        const department = await Department.findByPk(id);
        if (!department) {
            return res.status(404).json({ message: 'Department not found' });
        }

        // Optional: Add a check to ensure the user can only delete departments of their company
        // if (department.companyId !== req.user.companyId) {
        //   return res.status(403).json({ message: 'Forbidden' });
        // }

        await department.destroy();
        res.status(200).json({ message: 'Department deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};