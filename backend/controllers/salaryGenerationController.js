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
    User,
    sequelize
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
            if (current.day() === 0 || current.day() === 6) weekends++;
            current.add(1, 'day');
        }
        workingDays -= weekends;
    }
    
    return workingDays;
};

// Safe and robust formula evaluator
const evaluateFormula = (formula, context) => {
    if (!formula || typeof formula !== 'string') return 0;

    try {
        let expression = formula.trim();

        // Only replace known keys from context
        for (const [key, value] of Object.entries(context)) {
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            const replacement = typeof value === 'string' ? `"${value.replace(/"/g, '\\"')}"` : (value ?? 0);
            expression = expression.replace(regex, replacement);
        }

        console.log("Evaluating formula:", expression); // ← ADD THIS DEBUG LINE

        // eslint-disable-next-line no-eval
        const result = eval(expression);

        const numericResult = parseFloat(result);
        if (isNaN(numericResult)) {
            console.warn("Formula returned non-numeric:", result);
            return 0;
        }

        return numericResult;
    } catch (error) {
        console.error('Formula evaluation failed:', formula);
        console.error('Context:', context);
        console.error('Error:', error.message);
        return 0;
    }
};

// Final robust salary component calculator
const calculateSalaryComponents = async (salaryMaster, attendanceData, totalWorkingDays, externalContext = {}) => {
    const components = [];
    let totalEarnings = 0;
    let totalDeductions = 0;
    let basicSalary = 0;

    const paidDays = attendanceData.presentDays + attendanceData.paidLeaveDays +
                     attendanceData.holidayDays + attendanceData.weekOffDays;
    const attendanceFactor = totalWorkingDays > 0 ? paidDays / totalWorkingDays : 1;

    // Start with external context (grade, designation, etc.)
    const context = { ...externalContext };

    // PASS 1: Fixed + Percentage components
    for (const empComponent of salaryMaster.EmployeeSalaryComponents) {
        const component = empComponent.SalaryComponent;
        if (!component) continue;

        const calcType = empComponent.valueType || 'Fixed';
        if (calcType === 'Formula') continue; // Skip in first pass

        let baseAmount = 0;
        let calculatedAmount = 0;
        let isProrated = false;
        let proratedAmount = null;

        if (calcType === 'Fixed') {
            baseAmount = parseFloat(empComponent.fixedAmount) || 0;
            calculatedAmount = baseAmount;
        } else if (calcType === 'Percentage') {
            const baseCode = empComponent.percentageBase?.toUpperCase();
            const baseValue = context[baseCode] || 0;
            const pct = parseFloat(empComponent.percentageValue) || 0;
            baseAmount = (pct / 100) * baseValue;
            calculatedAmount = baseAmount;
        }

        let finalAmount = calculatedAmount;
        if (empComponent.isProrated && attendanceFactor < 1 && calculatedAmount > 0) {
            proratedAmount = calculatedAmount * attendanceFactor;
            finalAmount = proratedAmount;
            isProrated = true;
        }

        const code = component.code?.toUpperCase();
        if (code) context[code] = finalAmount;

        const compType = component.type || 'Earning';

        if (compType === 'Earning') {
            totalEarnings += finalAmount;
            if (code === 'BP' || component.name.toUpperCase().includes('BASIC')) {
                basicSalary = finalAmount;
            }
        } else if (compType === 'Deduction') {
            totalDeductions += finalAmount;
        }

        components.push({
            componentId: component.id,
            componentName: component.name,
            componentType: compType,
            calculationType: calcType,
            baseAmount,
            calculatedAmount: finalAmount,
            isProrated,
            proratedAmount,
            formula: null
        });
    }

    // PASS 2: Formula components
    for (const empComponent of salaryMaster.EmployeeSalaryComponents) {
        
        if (empComponent.valueType !== 'Formula' || !empComponent.formulaExpression) continue;
        
        const component = empComponent.SalaryComponent;
        console.log("emp",empComponent,"comp",component);
        if (!component) continue;

        let calculatedAmount = evaluateFormula(empComponent.formulaExpression, context);
        console.log("Formula expression:", empComponent.formulaExpression);
        console.log("Context:", context);
        console.log("Result from eval:", calculatedAmount);        
        let baseAmount = calculatedAmount;
        let formulaUsed = empComponent.formulaExpression;

        let finalAmount = calculatedAmount;
        let isProrated = false;
        let proratedAmount = null;

        if (empComponent.isProrated && attendanceFactor < 1 && calculatedAmount > 0) {
            proratedAmount = calculatedAmount * attendanceFactor;
            finalAmount = proratedAmount;
            isProrated = true;
        }

        const code = component.code?.toUpperCase();
        if (code) context[code] = finalAmount;

        const compType = component.type || 'Earning';

        if (compType === 'Earning') {
            totalEarnings += finalAmount;
        } else if (compType === 'Deduction') {
            totalDeductions += finalAmount;
        }

        components.push({
            componentId: component.id,
            componentName: component.name,
            componentType: compType,
            calculationType: 'Formula',
            baseAmount,
            calculatedAmount: finalAmount,
            isProrated,
            proratedAmount,
            formula: formulaUsed
        });
    }

    // PASS 3: Special components
    const perDayRate = basicSalary > 0 && totalWorkingDays > 0 ? basicSalary / totalWorkingDays : 0;

    if (attendanceData.absentDays > 0 && perDayRate > 0) {
        const amount = perDayRate * attendanceData.absentDays;
        totalDeductions += amount;
        components.push({
            componentId: null,
            componentName: 'Absent Deduction',
            componentType: 'Deduction',
            calculationType: 'Attendance',
            baseAmount: 0,
            calculatedAmount: amount,
            isProrated: false,
            proratedAmount: null,
            formula: null
        });
    }

    if (attendanceData.unpaidLeaveDays > 0 && perDayRate > 0) {
        const amount = perDayRate * attendanceData.unpaidLeaveDays;
        totalDeductions += amount;
        components.push({
            componentId: null,
            componentName: 'Unpaid Leave Deduction',
            componentType: 'Deduction',
            calculationType: 'Attendance',
            baseAmount: 0,
            calculatedAmount: amount,
            isProrated: false,
            proratedAmount: null,
            formula: null
        });
    }

    if (attendanceData.lateCount > 3) {
        const excess = attendanceData.lateCount - 3;
        const amount = perDayRate * 0.1 * excess;
        totalDeductions += amount;
        components.push({
            componentId: null,
            componentName: 'Late Arrival Deduction',
            componentType: 'Deduction',
            calculationType: 'Policy',
            baseAmount: 0,
            calculatedAmount: amount,
            isProrated: false,
            proratedAmount: null,
            formula: null
        });
    }

    if (attendanceData.overtimeHours > 0 && basicSalary > 0) {
        const hourlyRate = basicSalary / (totalWorkingDays * 8);
        const overtimePay = hourlyRate * 1.5 * attendanceData.overtimeHours;
        totalEarnings += overtimePay;
        components.push({
            componentId: null,
            componentName: 'Overtime Pay',
            componentType: 'Earning',
            calculationType: 'Attendance',
            baseAmount: 0,
            calculatedAmount: overtimePay,
            isProrated: false,
            proratedAmount: null,
            formula: null
        });
    }

    const grossSalary = totalEarnings;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    return {
        components,
        basicSalary,
        totalEarnings,
        totalDeductions,
        grossSalary,
        netSalary,
        overtimePay: attendanceData.overtimeHours > 0 ? (basicSalary / (totalWorkingDays * 8)) * 1.5 * attendanceData.overtimeHours : 0,
        lateDeduction: attendanceData.lateCount > 3 ? perDayRate * 0.1 * (attendanceData.lateCount - 3) : 0,
        absentDeduction: perDayRate * attendanceData.absentDays,
        leaveDeduction: perDayRate * attendanceData.unpaidLeaveDays
    };
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

// @desc    Generate salary for employees
// @route   POST /api/salary-generation/generate
// @access  Private
exports.generateSalary = async (req, res) => {
    console.log("Request payload:", req.body);
    const { companyId, month, year, employeeIds, generatedBy } = req.body;

    if (!companyId || !month || !year) {
        return res.status(400).json({ message: 'Company ID, month, and year are required' });
    }

    try {
        const results = { processed: 0, generated: 0, skipped: 0, errors: [] };

        const payPeriodStart = moment(`${year}-${month}-01`).format('YYYY-MM-DD');
        const payPeriodEnd = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
        const totalWorkingDays = getWorkingDays(year, month, false);

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
                    where: { 
                        status: 'Active',
                        effectiveFrom: { [Op.lte]: new Date(`${year}-${month}-01`) },
                        [Op.or]: [
                            { effectiveTo: null },
                            { effectiveTo: { [Op.gte]: new Date(`${year}-${month}-01`) } }
                        ]
                    },
                    required: true,
                    include: [{ model: EmployeeSalaryComponent, include: [SalaryComponent, Formula] }]
                }
            ]
        });

        for (const employee of employees) {
            try {
                results.processed++;

                const existing = await SalaryGeneration.findOne({
                    where: { employeeId: employee.id, salaryMonth: month, salaryYear: year }
                });

                if (existing) {
                    results.skipped++;
                    continue;
                }

                const salaryMaster = employee.EmployeeSalaryMasters[0];
                console.log("Debuggin ",salaryMaster);
                
                if (!salaryMaster) {
                    results.errors.push({ employeeId: employee.id, error: 'No active salary structure' });
                    continue;
                }

                const attendanceData = await calculateAttendanceMetrics(employee.id, payPeriodStart, payPeriodEnd);

                // Build external context for non-component variables
                const externalContext = {
                    grade: employee.grade?.name || '',
                    designation: employee.designation?.name || ''
                };

                const salaryCalculation = await calculateSalaryComponents(
                    salaryMaster,
                    attendanceData,
                    totalWorkingDays,
                    externalContext
                );

                console.log("Final Salary Calculation for", employee.firstName, employee.lastName, ":", salaryCalculation);

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
                results.errors.push({ employeeId: employee.id, error: error.message });
                console.error("Error processing employee", employee.id, ":", error);
            }
        }

        res.status(200).json({ message: 'Salary generation completed successfully', results });
    } catch (error) {
        console.error('Error generating salaries:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
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