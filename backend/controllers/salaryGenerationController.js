const { 
    SalaryGeneration, 
    SalaryGenerationDetail,
    Employee, 
    EmployeeSalaryMaster,
    EmployeeSalaryComponent,
    SalaryComponent,
    Formula,
    Attendance,
    LeaveRequest,
    Company,
    User
} = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');

// Helper function to get working days in month
const getWorkingDays = (year, month, excludeWeekends = false) => {
    const startDate = moment(`${year}-${month}-01`);
    const endDate = startDate.clone().endOf('month');
    let workingDays = endDate.date();
    
    if (excludeWeekends) {
        let current = startDate.clone();
        let weekends = 0;
        while (current <= endDate) {
            if (current.day() === 0 || current.day() === 6) {
                weekends++;
            }
            current.add(1, 'day');
        }
        workingDays -= weekends;
    }
    
    return workingDays;
};

// Helper function to evaluate formula
const evaluateFormula = (formula, context) => {
    try {
        // Replace component references with actual values
        let expression = formula;
        for (const [key, value] of Object.entries(context)) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            expression = expression.replace(regex, value || 0);
        }
        
        // Safely evaluate the expression
        // eslint-disable-next-line no-eval
        const result = eval(expression);
        return parseFloat(result) || 0;
    } catch (error) {
        console.error('Error evaluating formula:', error);
        return 0;
    }
};

// @desc    Generate salary for employees
// @route   POST /api/salary-generation/generate
// @access  Private
exports.generateSalary = async (req, res) => {
    const { companyId, month, year, employeeIds, generatedBy } = req.body;

    if (!companyId || !month || !year) {
        return res.status(400).json({ 
            message: 'Company ID, month, and year are required' 
        });
    }

    try {
        const results = {
            processed: 0,
            generated: 0,
            skipped: 0,
            errors: []
        };

        // Get pay period dates
        const payPeriodStart = moment(`${year}-${month}-01`).format('YYYY-MM-DD');
        const payPeriodEnd = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
        
        // Get working days
        const totalWorkingDays = getWorkingDays(year, month, false);

        // Get employees to process
        const whereClause = { companyId, status: 'Active' };
        if (employeeIds && employeeIds.length > 0) {
            whereClause.id = { [Op.in]: employeeIds };
        }

        const employees = await Employee.findAll({
            where: whereClause,
            include: [
                {
                    model: EmployeeSalaryMaster,
                    as: 'EmployeeSalaryMasters',
                    where: { isActive: true },
                    required: true,
                    include: [
                        {
                            model: EmployeeSalaryComponent,
                            include: [
                                { model: SalaryComponent },
                                { model: Formula }
                            ]
                        }
                    ]
                }
            ]
        });

        for (const employee of employees) {
            try {
                results.processed++;

                // Check if salary already generated for this month
                const existing = await SalaryGeneration.findOne({
                    where: {
                        employeeId: employee.id,
                        salaryMonth: month,
                        salaryYear: year
                    }
                });

                if (existing) {
                    results.skipped++;
                    continue;
                }

                // Get employee's active salary structure
                const salaryMaster = employee.EmployeeSalaryMasters[0];
                
                if (!salaryMaster) {
                    results.errors.push({
                        employeeId: employee.id,
                        error: 'No active salary structure found'
                    });
                    continue;
                }

                // Calculate attendance metrics
                const attendanceData = await calculateAttendanceMetrics(
                    employee.id,
                    payPeriodStart,
                    payPeriodEnd
                );

                // Calculate salary components
                const salaryCalculation = await calculateSalaryComponents(
                    salaryMaster,
                    attendanceData,
                    totalWorkingDays
                );

                // Create salary generation record
                const salaryGeneration = await SalaryGeneration.create({
                    employeeId: employee.id,
                    employeeSalaryMasterId: salaryMaster.id,
                    companyId,
                    salaryMonth: month,
                    salaryYear: year,
                    payPeriodStart,
                    payPeriodEnd,
                    workingDays: totalWorkingDays,
                    presentDays: attendanceData.presentDays,
                    absentDays: attendanceData.absentDays,
                    paidLeaveDays: attendanceData.paidLeaveDays,
                    unpaidLeaveDays: attendanceData.unpaidLeaveDays,
                    holidayDays: attendanceData.holidayDays,
                    weekOffDays: attendanceData.weekOffDays,
                    overtimeHours: attendanceData.overtimeHours,
                    lateCount: attendanceData.lateCount,
                    earlyExitCount: attendanceData.earlyExitCount,
                    basicSalary: salaryCalculation.basicSalary,
                    totalEarnings: salaryCalculation.totalEarnings,
                    totalDeductions: salaryCalculation.totalDeductions,
                    grossSalary: salaryCalculation.grossSalary,
                    netSalary: salaryCalculation.netSalary,
                    overtimePay: salaryCalculation.overtimePay,
                    lateDeduction: salaryCalculation.lateDeduction,
                    absentDeduction: salaryCalculation.absentDeduction,
                    leaveDeduction: salaryCalculation.leaveDeduction,
                    status: 'Generated',
                    generatedBy
                });

                // Create salary generation details
                for (const component of salaryCalculation.components) {
                    await SalaryGenerationDetail.create({
                        salaryGenerationId: salaryGeneration.id,
                        componentId: component.componentId,
                        componentName: component.componentName,
                        componentType: component.componentType,
                        calculationType: component.calculationType,
                        baseAmount: component.baseAmount,
                        calculatedAmount: component.calculatedAmount,
                        isProrated: component.isProrated,
                        proratedAmount: component.proratedAmount,
                        formula: component.formula
                    });
                }

                results.generated++;
            } catch (error) {
                results.errors.push({
                    employeeId: employee.id,
                    error: error.message
                });
            }
        }

        res.status(200).json({
            message: 'Salary generation completed',
            results
        });
    } catch (error) {
        console.error('Error generating salaries:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// Helper function to calculate attendance metrics
const calculateAttendanceMetrics = async (employeeId, startDate, endDate) => {
    const attendance = await Attendance.findAll({
        where: {
            employeeId,
            attendanceDate: {
                [Op.between]: [startDate, endDate]
            }
        }
    });

    const leaves = await LeaveRequest.findAll({
        where: {
            employeeId,
            status: 'Approved',
            [Op.or]: [
                {
                    startDate: {
                        [Op.between]: [startDate, endDate]
                    }
                },
                {
                    endDate: {
                        [Op.between]: [startDate, endDate]
                    }
                }
            ]
        }
    });

    let presentDays = 0;
    let absentDays = 0;
    let holidayDays = 0;
    let weekOffDays = 0;
    let overtimeHours = 0;
    let lateCount = 0;
    let earlyExitCount = 0;

    attendance.forEach(record => {
        if (record.status === 'Present') presentDays += 1;
        else if (record.status === 'Half Day') presentDays += 0.5;
        else if (record.status === 'Absent') absentDays += 1;
        else if (record.status === 'Holiday') holidayDays += 1;
        else if (record.status === 'Week Off') weekOffDays += 1;

        if (record.isLate) lateCount += 1;
        if (record.isEarlyExit) earlyExitCount += 1;
        if (record.overtimeHours) overtimeHours += parseFloat(record.overtimeHours);
    });

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    leaves.forEach(leave => {
        const leaveDays = moment(leave.endDate).diff(moment(leave.startDate), 'days') + 1;
        if (leave.leaveType?.isPaid) {
            paidLeaveDays += leaveDays;
        } else {
            unpaidLeaveDays += leaveDays;
        }
    });

    return {
        presentDays,
        absentDays,
        paidLeaveDays,
        unpaidLeaveDays,
        holidayDays,
        weekOffDays,
        overtimeHours,
        lateCount,
        earlyExitCount
    };
};

// Helper function to calculate salary components
const calculateSalaryComponents = async (salaryMaster, attendanceData, totalWorkingDays) => {
    const components = [];
    let totalEarnings = 0;
    let totalDeductions = 0;
    let basicSalary = 0;
    let overtimePay = 0;
    let lateDeduction = 0;
    let absentDeduction = 0;
    let leaveDeduction = 0;

    // Calculate attendance factor for proration
    const paidDays = attendanceData.presentDays + attendanceData.paidLeaveDays + 
                     attendanceData.holidayDays + attendanceData.weekOffDays;
    const attendanceFactor = paidDays / totalWorkingDays;

    // Build context for formula evaluation
    const context = {};

    // First pass: Calculate fixed and percentage components
    for (const empComponent of salaryMaster.EmployeeSalaryComponents) {
        const component = empComponent.SalaryComponent;
        let baseAmount = parseFloat(empComponent.amount) || 0;
        let calculatedAmount = baseAmount;
        let isProrated = false;
        let proratedAmount = null;

        // Apply proration if component should be prorated based on attendance
        if (empComponent.isProrated && attendanceFactor < 1) {
            proratedAmount = baseAmount * attendanceFactor;
            calculatedAmount = proratedAmount;
            isProrated = true;
        }

        if (component.componentType === 'Earning') {
            totalEarnings += calculatedAmount;
            if (component.name.toLowerCase().includes('basic')) {
                basicSalary = calculatedAmount;
            }
        } else {
            totalDeductions += calculatedAmount;
        }

        context[component.name] = calculatedAmount;

        components.push({
            componentId: component.id,
            componentName: component.name,
            componentType: component.componentType,
            calculationType: empComponent.calculationType,
            baseAmount,
            calculatedAmount,
            isProrated,
            proratedAmount,
            formula: null
        });
    }

    // Second pass: Calculate formula-based components
    for (const empComponent of salaryMaster.EmployeeSalaryComponents) {
        if (empComponent.Formula) {
            const component = empComponent.SalaryComponent;
            const formula = empComponent.Formula.expression;
            
            const calculatedAmount = evaluateFormula(formula, context);

            // Update the component in the array
            const componentIndex = components.findIndex(c => c.componentId === component.id);
            if (componentIndex !== -1) {
                components[componentIndex].calculatedAmount = calculatedAmount;
                components[componentIndex].formula = formula;
                
                if (component.componentType === 'Earning') {
                    totalEarnings += (calculatedAmount - components[componentIndex].baseAmount);
                } else {
                    totalDeductions += (calculatedAmount - components[componentIndex].baseAmount);
                }
            }

            context[component.name] = calculatedAmount;
        }
    }

    // Calculate overtime pay (if applicable)
    if (attendanceData.overtimeHours > 0 && basicSalary > 0) {
        const hourlyRate = basicSalary / (totalWorkingDays * 8); // Assuming 8-hour workday
        overtimePay = hourlyRate * 1.5 * attendanceData.overtimeHours; // 1.5x for overtime
        totalEarnings += overtimePay;
    }

    // Calculate deductions for absences and unpaid leaves
    if (attendanceData.absentDays > 0 || attendanceData.unpaidLeaveDays > 0) {
        const perDaySalary = basicSalary / totalWorkingDays;
        absentDeduction = perDaySalary * attendanceData.absentDays;
        leaveDeduction = perDaySalary * attendanceData.unpaidLeaveDays;
        totalDeductions += (absentDeduction + leaveDeduction);
    }

    // Calculate late deduction (optional - configure as needed)
    if (attendanceData.lateCount > 3) { // Example: deduct after 3 lates
        const excessLates = attendanceData.lateCount - 3;
        lateDeduction = (basicSalary / totalWorkingDays) * 0.1 * excessLates; // 10% of daily salary per late
        totalDeductions += lateDeduction;
    }

    const grossSalary = totalEarnings;
    const netSalary = grossSalary - totalDeductions;

    return {
        components,
        basicSalary,
        totalEarnings,
        totalDeductions,
        grossSalary,
        netSalary,
        overtimePay,
        lateDeduction,
        absentDeduction,
        leaveDeduction
    };
};

// @desc    Get salary generations with filters
// @route   GET /api/salary-generation
// @access  Private
exports.getSalaryGenerations = async (req, res) => {
    const { companyId, month, year, employeeId, status } = req.query;

    if (!companyId) {
        return res.status(400).json({ message: 'Company ID is required' });
    }

    try {
        const whereClause = { companyId };

        if (month) whereClause.salaryMonth = month;
        if (year) whereClause.salaryYear = year;
        if (employeeId) whereClause.employeeId = employeeId;
        if (status) whereClause.status = status;

        const salaries = await SalaryGeneration.findAll({
            where: whereClause,
            include: [
                {
                    model: Employee,
                    as: 'employee',
                    attributes: ['id', 'firstName', 'lastName', 'employeeCode']
                },
                {
                    model: User,
                    as: 'generator',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    required: false
                },
                {
                    model: User,
                    as: 'approver',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    required: false
                }
            ],
            order: [['salaryYear', 'DESC'], ['salaryMonth', 'DESC'], ['id', 'DESC']]
        });

        res.status(200).json(salaries);
    } catch (error) {
        console.error('Error fetching salary generations:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Get salary generation by ID with details
// @route   GET /api/salary-generation/:id
// @access  Private
exports.getSalaryGenerationById = async (req, res) => {
    const { id } = req.params;

    try {
        const salary = await SalaryGeneration.findByPk(id, {
            include: [
                {
                    model: Employee,
                    as: 'employee'
                },
                {
                    model: SalaryGenerationDetail,
                    as: 'details',
                    include: [
                        {
                            model: SalaryComponent
                        }
                    ]
                },
                {
                    model: EmployeeSalaryMaster,
                    as: 'salaryMaster'
                }
            ]
        });

        if (!salary) {
            return res.status(404).json({ message: 'Salary generation not found' });
        }

        res.status(200).json(salary);
    } catch (error) {
        console.error('Error fetching salary generation:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Approve salary generation
// @route   PATCH /api/salary-generation/:id/approve
// @access  Private
exports.approveSalary = async (req, res) => {
    const { id } = req.params;
    const { approvedBy } = req.body;

    try {
        const salary = await SalaryGeneration.findByPk(id);

        if (!salary) {
            return res.status(404).json({ message: 'Salary generation not found' });
        }

        if (salary.status !== 'Generated') {
            return res.status(400).json({ 
                message: 'Only generated salaries can be approved' 
            });
        }

        await salary.update({
            status: 'Approved',
            approvedBy,
            approvedAt: new Date()
        });

        res.status(200).json({
            message: 'Salary approved successfully',
            salary
        });
    } catch (error) {
        console.error('Error approving salary:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Mark salary as paid
// @route   PATCH /api/salary-generation/:id/pay
// @access  Private
exports.paySalary = async (req, res) => {
    const { id } = req.params;
    const { paidBy, paymentMethod, paymentReference } = req.body;

    try {
        const salary = await SalaryGeneration.findByPk(id);

        if (!salary) {
            return res.status(404).json({ message: 'Salary generation not found' });
        }

        if (salary.status !== 'Approved') {
            return res.status(400).json({ 
                message: 'Only approved salaries can be paid' 
            });
        }

        await salary.update({
            status: 'Paid',
            paidBy,
            paidAt: new Date(),
            paymentMethod,
            paymentReference
        });

        res.status(200).json({
            message: 'Salary marked as paid successfully',
            salary
        });
    } catch (error) {
        console.error('Error paying salary:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Delete salary generation
// @route   DELETE /api/salary-generation/:id
// @access  Private
exports.deleteSalaryGeneration = async (req, res) => {
    const { id } = req.params;

    try {
        const salary = await SalaryGeneration.findByPk(id);

        if (!salary) {
            return res.status(404).json({ message: 'Salary generation not found' });
        }

        if (salary.status === 'Paid') {
            return res.status(400).json({ 
                message: 'Cannot delete paid salary' 
            });
        }

        await salary.destroy();

        res.status(200).json({ message: 'Salary generation deleted successfully' });
    } catch (error) {
        console.error('Error deleting salary generation:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

// @desc    Get salary summary
// @route   GET /api/salary-generation/summary
// @access  Private
exports.getSalarySummary = async (req, res) => {
    const { companyId, month, year } = req.query;

    if (!companyId || !month || !year) {
        return res.status(400).json({ 
            message: 'Company ID, month, and year are required' 
        });
    }

    try {
        const salaries = await SalaryGeneration.findAll({
            where: {
                companyId,
                salaryMonth: month,
                salaryYear: year
            },
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('grossSalary')), 'totalGross'],
                [sequelize.fn('SUM', sequelize.col('netSalary')), 'totalNet'],
                [sequelize.fn('SUM', sequelize.col('totalDeductions')), 'totalDeductions']
            ],
            group: ['status']
        });

        res.status(200).json(salaries);
    } catch (error) {
        console.error('Error fetching salary summary:', error);
        res.status(500).json({ 
            message: 'Server Error', 
            error: error.message 
        });
    }
};

module.exports = exports;
