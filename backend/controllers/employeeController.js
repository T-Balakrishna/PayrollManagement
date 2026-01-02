
const { Employee, Company, Department, Designation, EmploymentType, ShiftType, LeavePolicy, BiometricDevice, Bus } = require('../models');
const Papa = require('papaparse');

// @desc    Get all employees for a specific company
// @route   GET /api/employees?companyId=1
// @access  Private
exports.getEmployeesByCompany = async (req, res) => {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    try {
        const employees = await Employee.findAll({
            where: { companyId },
            include: [
                { model: Department, as: 'department', attributes: ['id', 'name'] },
                { model: Designation, as: 'designation', attributes: ['id', 'name'] },
            ],
            order: [['employeeCode', 'ASC']],
        });
        
        // Add computed fields
        const employeesWithComputed = employees.map(emp => {
            const empData = emp.toJSON();
            empData.age = emp.getAge();
            empData.retirementDate = emp.getRetirementDate();
            empData.fullName = emp.getFullName();
            return empData;
        });
        
        res.status(200).json(employeesWithComputed);
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get a single employee by ID
// @route   GET /api/employees/:id
// @access  Private
exports.getEmployeeById = async (req, res) => {
    const { id } = req.params;
    try {
        const employee = await Employee.findByPk(id, {
            include: [
                { model: Company, as: 'company', attributes: ['id', 'name'] },
                { model: Department, as: 'department', attributes: ['id', 'name'] },
                { model: Designation, as: 'designation', attributes: ['id', 'name'] },
                { model: EmploymentType, as: 'employmentType', attributes: ['id', 'name'] },
                { model: ShiftType, as: 'shiftType', attributes: ['id', 'name'] },
                { model: LeavePolicy, as: 'leavePolicy', attributes: ['id', 'name'] },
                { model: BiometricDevice, as: 'biometricDevice', attributes: ['id', 'name'] },
                { model: Bus, as: 'bus', attributes: ['id', 'name'] },
                { model: Employee, as: 'reportingManager', attributes: ['id', 'firstName', 'lastName', 'employeeCode'] },
            ],
        });
        
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        
        const empData = employee.toJSON();
        empData.age = employee.getAge();
        empData.retirementDate = employee.getRetirementDate();
        empData.fullName = employee.getFullName();
        
        res.status(200).json(empData);
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Create a new employee
// @route   POST /api/employees
// @access  Private
exports.createEmployee = async (req, res) => {
    try {
        // Clean up empty strings for foreign keys and optional fields
        const cleanedData = { ...req.body };
        
        // Convert empty strings to null for foreign key fields
        const foreignKeyFields = [
            'reportingManagerId', 'shiftTypeId', 'leavePolicyId', 
            'biometricDeviceId', 'busId', 'designationId', 
            'employmentTypeId', 'departmentId', 'gradeId'
        ];
        
        foreignKeyFields.forEach(field => {
            if (cleanedData[field] === '' || cleanedData[field] === undefined) {
                cleanedData[field] = null;
            }
        });
        
        // Convert empty strings to null for optional text fields
        const optionalFields = [
            'middleName', 'officialEmail', 'alternateMobile', 
            'emergencyContactName', 'emergencyContactNumber', 'emergencyContactRelationship',
            'currentAddressLine2', 'permanentAddressLine1', 'permanentAddressLine2',
            'permanentCity', 'permanentState', 'permanentPincode', 'permanentCountry',
            'confirmationDate', 'workLocation', 'referencePersonName', 'referencePersonContact',
            'biometricEnrollmentId', 'bankName', 'bankAccountNumber', 'ifscCode', 
            'bankBranch', 'panNumber', 'uanNumber', 'esiNumber', 'pickupPoint',
            'aadhaarNumber', 'passportNumber', 'drivingLicenseNumber', 'voterIdNumber',
            'profilePhoto', 'bloodGroup', 'maritalStatus'
        ];
        
        optionalFields.forEach(field => {
            if (cleanedData[field] === '') {
                cleanedData[field] = null;
            }
        });
        
        const newEmployee = await Employee.create(cleanedData);
        res.status(201).json(newEmployee);
    } catch (error) {
        console.error('Error creating employee:', error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            message = 'An employee with this employee code already exists.';
        }
        res.status(400).json({ message });
    }
};

// @desc    Update an employee
// @route   PUT /api/employees/:id
// @access  Private
exports.updateEmployee = async (req, res) => {
    const { id } = req.params;
    try {
        const employee = await Employee.findByPk(id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        await employee.update(req.body);
        res.status(200).json(employee);
    } catch (error) {
        console.error('Error updating employee:', error);
        let message = 'Server Error';
        if (error.name === 'SequelizeValidationError') {
            message = error.errors.map(err => err.message).join(' ');
        }
        res.status(400).json({ message });
    }
};

// @desc    Delete an employee
// @route   DELETE /api/employees/:id
// @access  Private
exports.deleteEmployee = async (req, res) => {
    const { id } = req.params;
    try {
        const employee = await Employee.findByPk(id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        // TODO: Add a check here to prevent deletion if the employee has attendance or payroll records
        await employee.destroy();
        res.status(200).json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Bulk upload employees from CSV
// @route   POST /api/employees/bulk-upload
// @access  Private
exports.bulkUploadEmployees = async (req, res) => {
    try {
        const { csvData, companyId } = req.body;
        
        if (!csvData || !companyId) {
            return res.status(400).json({ message: 'CSV data and company ID are required' });
        }

        // Parse CSV data
        const parsedData = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
        });

        if (parsedData.errors.length > 0) {
            return res.status(400).json({ 
                message: 'CSV parsing error', 
                errors: parsedData.errors 
            });
        }

        const employees = parsedData.data;
        const results = {
            total: employees.length,
            success: 0,
            failed: 0,
            errors: []
        };

        // Process each employee
        for (let i = 0; i < employees.length; i++) {
            try {
                const empData = { ...employees[i], companyId };
                
                // Convert boolean strings to actual booleans
                if (typeof empData.isTrainee === 'string') {
                    empData.isTrainee = empData.isTrainee.toLowerCase() === 'true';
                }
                if (typeof empData.isHostel === 'string') {
                    empData.isHostel = empData.isHostel.toLowerCase() === 'true';
                }
                if (typeof empData.isTransportRequired === 'string') {
                    empData.isTransportRequired = empData.isTransportRequired.toLowerCase() === 'true';
                }
                if (typeof empData.isOvertimeApplicable === 'string') {
                    empData.isOvertimeApplicable = empData.isOvertimeApplicable.toLowerCase() === 'true';
                }
                if (typeof empData.isLeaveApplicable === 'string') {
                    empData.isLeaveApplicable = empData.isLeaveApplicable.toLowerCase() === 'true';
                }
                
                await Employee.create(empData);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    row: i + 1,
                    employeeCode: employees[i].employeeCode || 'Unknown',
                    error: error.message
                });
            }
        }

        res.status(200).json({
            message: 'Bulk upload completed',
            results
        });
    } catch (error) {
        console.error('Error in bulk upload:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Download employee CSV template
// @route   GET /api/employees/download-template
// @access  Private
exports.downloadTemplate = async (req, res) => {
    const csvTemplate = `employeeCode,firstName,middleName,lastName,dateOfBirth,gender,bloodGroup,maritalStatus,personalEmail,officialEmail,mobileNumber,alternateMobile,emergencyContactName,emergencyContactNumber,emergencyContactRelationship,currentAddressLine1,currentAddressLine2,currentCity,currentState,currentPincode,currentCountry,permanentAddressLine1,permanentAddressLine2,permanentCity,permanentState,permanentPincode,permanentCountry,departmentId,designationId,employmentTypeId,employeeType,dateOfJoining,confirmationDate,probationPeriod,reportingManagerId,workLocation,employmentStatus,referencePersonName,referencePersonContact,shiftTypeId,leavePolicyId,weeklyOff,isOvertimeApplicable,isLeaveApplicable,biometricDeviceId,biometricEnrollmentId,basicSalary,bankName,bankAccountNumber,ifscCode,bankBranch,paymentMode,panNumber,uanNumber,esiNumber,isTransportRequired,busId,pickupPoint,isHostel,isTrainee,aadhaarNumber,passportNumber,drivingLicenseNumber,voterIdNumber,status
EMP001,John,M,Doe,1990-01-15,Male,A+,Single,john.doe@example.com,john.doe@company.com,9876543210,9876543211,Jane Doe,9876543212,Spouse,123 Main St,,New York,NY,10001,USA,123 Main St,,New York,NY,10001,USA,1,1,1,Permanent,2023-01-01,2023-04-01,3,2,Head Office,Active,Robert Smith,9876543213,1,1,Sunday,false,true,1,BIO001,25000,HDFC Bank,1234567890,HDFC0001234,NY Branch,Bank Transfer,ABCDE1234F,123456789012,1234567890,false,1,Main Street,false,false,123456789012,A1234567,DL123456,ABC1234567,Active`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=employee_template.csv');
    res.status(200).send(csvTemplate);
};