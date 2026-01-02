// controllers/employeeReportsController.js - FIXED VERSION
const { Op } = require('sequelize');
//const sequelize = require('../config/database');
const db = require('../models');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const sequelize = db.sequelize;
const Employee = db.Employee;
const Department = db.Department;
const Company = db.Company;
const Designation = db.Designation;
const EmploymentType = db.EmploymentType; // Added employment type
const Leave = db.Leave;
const LeaveType = db.LeaveType;
const Attendance = db.Attendance;
const BiometricPunch = db.BiometricPunch;

// ==========================================
// 1. EMPLOYEE DETAILS REPORT
// ==========================================

exports.getEmployeeDetails = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employment_type_id,
      status = 'Active',
      page = 1,
      limit = 50
    } = req.query;

    // Validate inputs
    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    const offset = (page - 1) * limit;

    // Build optimized where clause
    const whereClause = {
      companyId: company_id,
      status: status
    };

    if (department_id) whereClause.departmentId = department_id;
    if (employment_type_id) whereClause.employmentTypeId = employment_type_id;

    // Get employees with all associations
    const { count, rows: employees } = await Employee.findAndCountAll({
      where: whereClause,
      attributes: [
        'id', 'employeeCode', 'firstName', 'lastName',
        'officialEmail', 'mobileNumber', 'dateOfJoining',
        'status', 'companyId', 'departmentId', 'designationId', 'employmentTypeId'
      ],
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name', 'registrationNumber'],
          required: false
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Designation,
          as: 'designation',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: EmploymentType,
          as: 'employmentType',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['firstName', 'ASC']],
      distinct: true
    });

    // Format response with correct field mappings
    const formattedEmployees = employees.map(emp => ({
      employee_id: emp.id,
      employee_code: emp.employeeCode,
      employee_name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
      first_name: emp.firstName,
      last_name: emp.lastName,
      
      // Company details - YOUR DB uses 'name', not 'company_name'
      company_id: emp.companyId,
      company_name: emp.company?.name || 'N/A',
      company_code: emp.company?.registrationNumber || 'N/A',
      
      // Department details - YOUR DB uses 'name', not 'department_name'
      department_id: emp.departmentId,
      department_name: emp.department?.name || 'N/A',
      //department_code: emp.department?.code || 'N/A',
      
      // Designation details - YOUR DB uses 'name'
      designation_id: emp.designationId,
      designation_name: emp.designation?.name || 'N/A',
      
      // Employment type details - YOUR DB uses 'name', not 'employment_type_name'
      employment_type_id: emp.employmentTypeId,
      employment_type_name: emp.employmentType?.name || 'N/A',
      //employment_type_code: emp.employmentType?.code || 'N/A',
      
      email: emp.officialEmail || '',
      mobile: emp.mobileNumber || '',
      date_of_joining: emp.dateOfJoining,
      status: emp.status
    }));

    return res.json({
      success: true,
      data: formattedEmployees,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get employee details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch employee details',
      error: error.message || 'Internal server error'
    });
  }
};

   
// ==========================================
// 2. LEAVE BALANCE REPORT
// ==========================================

// 
exports.getLeaveBalance = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employee_id,
      leave_type_id,
      year = new Date().getFullYear()
    } = req.query;

    console.log('📊 Leave Balance Request:', { company_id, department_id, employee_id, leave_type_id, year });

    // Build employee where clause
    const employeeWhere = {
      status: 'Active'
    };

    if (company_id) employeeWhere.companyId = company_id;
    if (department_id) employeeWhere.departmentId = department_id;
    if (employee_id) employeeWhere.id = employee_id;

    // Fetch employees
    const employees = await Employee.findAll({
      where: employeeWhere,
      attributes: ['id', 'employeeCode', 'firstName', 'lastName', 'companyId', 'departmentId', 'employmentTypeId'],
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: EmploymentType,
          as: 'employmentType',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['firstName', 'ASC']]
    });

    console.log(`✅ Found ${employees.length} employees`);

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {
          total_employees: 0,
          total_leave_types: 0,
          year: year
        }
      });
    }

    // Fetch leave types for the company
    const leaveTypeWhere = {
      status: 'Active'
    };
    
    if (company_id) leaveTypeWhere.companyId = company_id;
    if (leave_type_id) leaveTypeWhere.id = leave_type_id;

    const leaveTypes = await LeaveType.findAll({
      where: leaveTypeWhere,
      attributes: ['id', 'name', 'isCarryForwardEnabled'],
      order: [['name', 'ASC']]
    });

    console.log(`✅ Found ${leaveTypes.length} leave types`);

    
    const LeaveAllocation = db.LeaveAllocation;
    
    const leaveAllocations = await LeaveAllocation.findAll({
      where: {
        employeeId: employees.map(e => e.id),
        leaveTypeId: leave_type_id ? [leave_type_id] : leaveTypes.map(lt => lt.id),
        companyId: company_id,
        status: 'Active',
        // Filter by year - check if effectiveFrom/effectiveTo falls in the year
        [Op.and]: [
          sequelize.where(sequelize.fn('YEAR', sequelize.col('effectiveFrom')), '<=', year),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('effectiveTo')), '>=', year)
        ]
      },
      attributes: [
        'id',
        'employeeId', 
        'leaveTypeId', 
        'allocatedLeaves', 
        'carryForwardFromPrevious',
        'usedLeaves',
        'totalAccruedTillDate',
        'maxCarryForwardLimit',
        'enableMonthlyAccrual',
        'monthlyAccrualRate'
      ]
    });
    
    console.log(`✅ Found ${leaveAllocations.length} leave allocations`);

    // ==========================================
    // BUILD LEAVE BALANCE REPORT
    // ==========================================
    const leaveBalanceReport = [];

    employees.forEach(employee => {
      leaveTypes.forEach(leaveType => {
        // Find allocation for this employee and leave type
        const allocation = leaveAllocations.find(
          a => a.employeeId === employee.id && a.leaveTypeId === leaveType.id
        );

        if (allocation) {
          // Calculate total available using the allocation data
          const allocatedLeaves = parseFloat(allocation.allocatedLeaves || 0);
          const carryForward = parseFloat(allocation.carryForwardFromPrevious || 0);
          const accrued = parseFloat(allocation.totalAccruedTillDate || 0);
          const totalAllowed = allocatedLeaves + carryForward + accrued;
          
          const totalUsed = parseFloat(allocation.usedLeaves || 0);
          const balance = totalAllowed - totalUsed;

          leaveBalanceReport.push({
            employee_id: employee.id,
            employee_code: employee.employeeCode || 'N/A',
            employee_name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            company_name: employee.company?.name || 'N/A',
            department_name: employee.department?.name || 'N/A',
            employment_type_name: employee.employmentType?.name || 'N/A',
            leave_type_id: leaveType.id,
            leave_type_name: leaveType.name,
            allocated_leaves: allocatedLeaves,
            carry_forward: carryForward,
            accrued: accrued,
            total_allowed: totalAllowed,
            total_used: totalUsed,
            balance: balance,
            year: year
          });
        } else {
          // No allocation found - show 0s
          leaveBalanceReport.push({
            employee_id: employee.id,
            employee_code: employee.employeeCode || 'N/A',
            employee_name: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            company_name: employee.company?.name || 'N/A',
            department_name: employee.department?.name || 'N/A',
            employment_type_name: employee.employmentType?.name || 'N/A',
            leave_type_id: leaveType.id,
            leave_type_name: leaveType.name,
            allocated_leaves: 0,
            carry_forward: 0,
            accrued: 0,
            total_allowed: 0,
            total_used: 0,
            balance: 0,
            year: year
          });
        }
      });
    });

    console.log(`✅ Generated ${leaveBalanceReport.length} leave balance records`);

    return res.json({
      success: true,
      data: leaveBalanceReport,
      summary: {
        total_employees: employees.length,
        total_leave_types: leaveTypes.length,
        total_allocated: leaveBalanceReport.reduce((sum, item) => sum + item.total_allowed, 0),
        total_used: leaveBalanceReport.reduce((sum, item) => sum + item.total_used, 0),
        total_balance: leaveBalanceReport.reduce((sum, item) => sum + item.balance, 0),
        year: year
      }
    });

  } catch (error) {
    console.error('❌ Get leave balance error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leave balance',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};



// ==========================================
// 3. LEAVE TAKEN REPORT
// ==========================================

// exports.getLeaveTaken = async (req, res) => {
//   try {
//     const {
//       company_id,
//       department_id,
//       employee_id,
//       leave_type_id,
//       from_date,
//       to_date,
//       status,
//       page = 1,
//       limit = 50
//     } = req.query;

//     // Validate required dates
//     if (!from_date || !to_date) {
//       return res.status(400).json({
//         success: false,
//         message: 'from_date and to_date are required'
//       });
//     }

//     const offset = (page - 1) * limit;

//     // Build employee where clause
//     const employeeWhere = {};
//     if (company_id) employeeWhere.companyid = company_id;
//     if (department_id) employeeWhere.departmentid = department_id;
//     if (employee_id) employeeWhere.id = employee_id;

//     // Get employees
//     const employees = await Employee.findAll({
//       where: employeeWhere,
//       attributes: ['id']
//     });

//     if (employees.length === 0) {
//       return res.json({
//         success: true,
//         data: [],
//         pagination: { total: 0, page: 1, limit, totalPages: 0 }
//       });
//     }

//     // Build leave where clause
//     const leaveWhere = {
//       employee_id: employees.map(e => e.employee_id),
//       [Op.or]: [
//         {
//           from_date: {
//             [Op.between]: [from_date, to_date]
//           }
//         },
//         {
//           to_date: {
//             [Op.between]: [from_date, to_date]
//           }
//         },
//         {
//           [Op.and]: [
//             { from_date: { [Op.lte]: from_date } },
//             { to_date: { [Op.gte]: to_date } }
//           ]
//         }
//       ]
//     };

//     if (leave_type_id) leaveWhere.leave_type_id = leave_type_id;
//     if (status) leaveWhere.status = status;

//     // FIXED: Get leaves with all employee details
//     const { count, rows: leaves } = await Leave.findAndCountAll({
//       where: leaveWhere,
//       include: [
//         {
//           model: Employee,
//           as: 'employee',
//           attributes: ['employee_id', 'employee_code', 'employee_name'],
//           include: [
//             {
//               model: Company,
//               as: 'company',
//               attributes: ['company_id', 'company_name']
//             },
//             {
//               model: Department,
//               as: 'department',
//               attributes: ['department_id', 'department_name']
//             },
//             {
//               model: EmploymentType,
//               as: 'employmentType',
//               attributes: ['employment_type_id', 'employment_type_name']
//             }
//           ]
//         },
//         {
//           model: LeaveType,
//           as: 'leaveType',
//           attributes: ['leave_type_id', 'leave_type_name', 'leave_type_code']
//         }
//       ],
//       limit: parseInt(limit),
//       offset: offset,
//       order: [['from_date', 'DESC']],
//       distinct: true
//     });

//     // Format response
//     const formattedLeaves = leaves.map(leave => ({
//       leave_id: leave.leave_id,
//       employee_id: leave.employee_id,
//       employee_code: leave.employee?.employee_code,
//       employee_name: leave.employee?.employee_name,
      
//       // FIXED: Include all company/department details
//       company_id: leave.employee?.company?.company_id,
//       company_name: leave.employee?.company?.company_name || 'N/A',
//       department_id: leave.employee?.department?.department_id,
//       department_name: leave.employee?.department?.department_name || 'N/A',
//       employment_type_id: leave.employee?.employmentType?.employment_type_id,
//       employment_type_name: leave.employee?.employmentType?.employment_type_name || 'N/A',
      
//       leave_type_id: leave.leave_type_id,
//       leave_type_name: leave.leaveType?.leave_type_name,
//       leave_type_code: leave.leaveType?.leave_type_code,
//       from_date: leave.from_date,
//       to_date: leave.to_date,
//       total_days: leave.total_days,
//       reason: leave.reason,
//       status: leave.status,
//       applied_date: leave.applied_date,
//       approved_by: leave.approved_by,
//       approved_date: leave.approved_date,
//       remarks: leave.remarks
//     }));

//     res.json({
//       success: true,
//       data: formattedLeaves,
//       pagination: {
//         total: count,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages: Math.ceil(count / limit)
//       }
//     });

//   } catch (error) {
//     console.error('Get leave taken error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch leave taken data',
//       error: error.message
//     });
//   }
// };
exports.getLeaveTaken = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employee_id,
      leave_type_id,
      from_date,
      to_date,
      status,
      page = 1,
      limit = 50
    } = req.query;

    // Validate required dates
    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date are required'
      });
    }

    const offset = (page - 1) * limit;

    // Build employee where clause with correct field names
    const employeeWhere = {};
    if (company_id) employeeWhere.companyId = company_id;
    if (department_id) employeeWhere.departmentId = department_id;
    if (employee_id) employeeWhere.id = employee_id;

    // Get employees
    const employees = await db.Employee.findAll({
      where: employeeWhere,
      attributes: ['id', 'employeeCode', 'firstName', 'lastName']
    });

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit, totalPages: 0 }
      });
    }

    // Build leave request where clause with CORRECT field names
    const leaveWhere = {
      employeeId: employees.map(e => e.id),
      [Op.or]: [
        {
          startDate: { // Changed from from_date to startDate
            [Op.between]: [from_date, to_date]
          }
        },
        {
          endDate: { // Changed from to_date to endDate
            [Op.between]: [from_date, to_date]
          }
        },
        {
          [Op.and]: [
            { startDate: { [Op.lte]: from_date } }, // Changed field name
            { endDate: { [Op.gte]: to_date } }     // Changed field name
          ]
        }
      ]
    };

    if (leave_type_id) leaveWhere.leaveTypeId = leave_type_id;
    if (status) leaveWhere.status = status;

    // Get leave requests with correct model and field names
    const { count, rows: leaves } = await db.LeaveRequest.findAndCountAll({
      where: leaveWhere,
      include: [
        {
          model: db.Employee,
          as: 'Employee', // Changed from 'employee' to 'Employee'
          attributes: ['id', 'employeeCode', 'firstName', 'lastName'],
          include: [
            {
              model: db.Company,
              as: 'company',
              attributes: ['id', 'name']
            },
            {
              model: db.Department,
              as: 'department',
              attributes: ['id', 'name']
            },
            {
              model: db.EmploymentType,
              as: 'employmentType',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: db.LeaveType,
          as: 'LeaveType', // Changed from 'leaveType' to 'LeaveType'
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['startDate', 'DESC']],
      distinct: true
    });

    // Update response formatting to use correct aliases
    const formattedLeaves = leaves.map(leave => ({
      leave_id: leave.id,
      employee_id: leave.employeeId,
      employee_code: leave.Employee?.employeeCode, // Changed from employee to Employee
      employee_name: `${leave.Employee?.firstName || ''} ${leave.Employee?.lastName || ''}`.trim(),
      company_name: leave.Employee?.company?.name || 'N/A',
      department_name: leave.Employee?.department?.name || 'N/A',
      employment_type_name: leave.Employee?.employmentType?.name || 'N/A',
      leave_type_name: leave.LeaveType?.name || 'N/A', // Changed from leaveType to LeaveType
      from_date: leave.startDate,
      to_date: leave.endDate,
      total_days: leave.totalDays,
      reason: leave.reason,
      status: leave.status,
      applied_date: leave.createdAt,
      approved_by: leave.approvedBy,
      approved_date: leave.approvedAt,
      remarks: leave.remarks
    }));

    return res.json({
      success: true,
      data: formattedLeaves,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get leave taken error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch leave taken data',
      error: error.message
    });
  }
};

// ==========================================
// 4. ATTENDANCE REPORT
// ==========================================

exports.getAttendanceReport = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employee_id,
      from_date,
      to_date,
      attendance_status,
      page = 1,
      limit = 50
    } = req.query;

    // Validate required dates
    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date are required'
      });
    }

    const offset = (page - 1) * limit;

    // Build employee where clause
    const employeeWhere = {};
    if (company_id) employeeWhere.company_id = company_id;
    if (department_id) employeeWhere.department_id = department_id;
    if (employee_id) employeeWhere.employee_id = employee_id;

    // Get employees
    const employees = await Employee.findAll({
      where: employeeWhere,
      attributes: ['employee_id']
    });

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        summary: {},
        pagination: { total: 0, page: 1, limit, totalPages: 0 }
      });
    }

    // Build attendance where clause
    const attendanceWhere = {
      employee_id: employees.map(e => e.employee_id),
      attendance_date: {
        [Op.between]: [from_date, to_date]
      }
    };

    if (attendance_status) attendanceWhere.attendance_status = attendance_status;

    // FIXED: Get attendance with all employee details
    const { count, rows: attendanceRecords } = await Attendance.findAndCountAll({
      where: attendanceWhere,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['employee_id', 'employee_code', 'employee_name'],
          include: [
            {
              model: Company,
              as: 'company',
              attributes: ['company_id', 'company_name']
            },
            {
              model: Department,
              as: 'department',
              attributes: ['department_id', 'department_name']
            },
            {
              model: EmploymentType,
              as: 'employmentType',
              attributes: ['employment_type_id', 'employment_type_name']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['attendance_date', 'DESC'], ['employee_id', 'ASC']],
      distinct: true
    });

    // Calculate summary
    const summary = {
      present: 0,
      absent: 0,
      leave: 0,
      holiday: 0,
      late_entries: 0,
      total_records: count
    };

    // Format response
    const formattedAttendance = attendanceRecords.map(att => {
      // Update summary
      if (att.attendance_status === 'Present') summary.present++;
      else if (att.attendance_status === 'Absent') summary.absent++;
      else if (att.attendance_status === 'Leave') summary.leave++;
      else if (att.attendance_status === 'Holiday') summary.holiday++;

      // Check if late
      const isLate = att.check_in_time && att.check_in_time > '09:30:00';
      if (isLate) summary.late_entries++;

      return {
        attendance_id: att.attendance_id,
        employee_id: att.employee_id,
        employee_code: att.employee?.employee_code,
        employee_name: att.employee?.employee_name,
        
        // FIXED: Include all details
        company_id: att.employee?.company?.company_id,
        company_name: att.employee?.company?.company_name || 'N/A',
        department_id: att.employee?.department?.department_id,
        department_name: att.employee?.department?.department_name || 'N/A',
        employment_type_id: att.employee?.employmentType?.employment_type_id,
        employment_type_name: att.employee?.employmentType?.employment_type_name || 'N/A',
        
        attendance_date: att.attendance_date,
        attendance_status: att.attendance_status,
        check_in_time: att.check_in_time,
        check_out_time: att.check_out_time,
        total_hours: att.total_hours,
        is_late: isLate,
        late_by_minutes: isLate ? calculateLateMinutes(att.check_in_time) : 0,
        remarks: att.remarks
      };
    });

    res.json({
      success: true,
      data: formattedAttendance,
      summary: summary,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get attendance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance report',
      error: error.message
    });
  }
};

// Helper function to calculate late minutes
function calculateLateMinutes(checkInTime) {
  if (!checkInTime) return 0;
  
  const standardTime = new Date(`2000-01-01 09:30:00`);
  const actualTime = new Date(`2000-01-01 ${checkInTime}`);
  
  const diffMs = actualTime - standardTime;
  return Math.max(0, Math.floor(diffMs / 60000));
}

// ==========================================
// 5. BIOMETRIC PUNCH REPORT
// ==========================================

exports.getBiometricReport = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employee_id,
      from_date,
      to_date,
      punch_type,
      page = 1,
      limit = 100
    } = req.query;

    // Validate required dates
    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date are required'
      });
    }

    const offset = (page - 1) * limit;

    // Build employee where clause
    const employeeWhere = {};
    if (company_id) employeeWhere.company_id = company_id;
    if (department_id) employeeWhere.department_id = department_id;
    if (employee_id) employeeWhere.employee_id = employee_id;

    // Get employees
    const employees = await Employee.findAll({
      where: employeeWhere,
      attributes: ['employee_id']
    });

    if (employees.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit, totalPages: 0 }
      });
    }

    // Build punch where clause
    const punchWhere = {
      employee_id: employees.map(e => e.employee_id),
      punch_date: {
        [Op.between]: [from_date, to_date]
      }
    };

    if (punch_type) punchWhere.punch_type = punch_type;

    // FIXED: Get punches with all employee details
    const { count, rows: punches } = await BiometricPunch.findAndCountAll({
      where: punchWhere,
      include: [
        {
          model: Employee,
          as: 'employee',
          attributes: ['employee_id', 'employee_code', 'employee_name'],
          include: [
            {
              model: Company,
              as: 'company',
              attributes: ['company_id', 'company_name']
            },
            {
              model: Department,
              as: 'department',
              attributes: ['department_id', 'department_name']
            },
            {
              model: EmploymentType,
              as: 'employmentType',
              attributes: ['employment_type_id', 'employment_type_name']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['punch_date', 'DESC'], ['punch_time', 'DESC']],
      distinct: true
    });

    // Format response
    const formattedPunches = punches.map(punch => ({
      punch_id: punch.punch_id,
      employee_id: punch.employee_id,
      employee_code: punch.employee?.employee_code,
      employee_name: punch.employee?.employee_name,
      
      // FIXED: Include all details
      company_id: punch.employee?.company?.company_id,
      company_name: punch.employee?.company?.company_name || 'N/A',
      department_id: punch.employee?.department?.department_id,
      department_name: punch.employee?.department?.department_name || 'N/A',
      employment_type_id: punch.employee?.employmentType?.employment_type_id,
      employment_type_name: punch.employee?.employmentType?.employment_type_name || 'N/A',
      
      punch_date: punch.punch_date,
      punch_time: punch.punch_time,
      punch_type: punch.punch_type,
      device_id: punch.device_id,
      device_name: punch.device_name,
      location: punch.location
    }));

    res.json({
      success: true,
      data: formattedPunches,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Get biometric report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch biometric report',
      error: error.message
    });
  }
};

// ==========================================
// 6. COMPREHENSIVE EMPLOYEE REPORT
// ==========================================

exports.getComprehensiveReport = async (req, res) => {
  try {
    const {
      employee_id,
      from_date,
      to_date
    } = req.query;

    // Validate required fields
    if (!employee_id) {
      return res.status(400).json({
        success: false,
        message: 'employee_id is required'
      });
    }

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'from_date and to_date are required'
      });
    }

    // FIXED: Get employee with all details
    const employee = await Employee.findOne({
      where: { employee_id },
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['company_id', 'company_name', 'company_code']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['department_id', 'department_name', 'department_code']
        },
        {
          model: Designation,
          as: 'designation',
          attributes: ['designation_id', 'designation_name']
        },
        {
          model: EmploymentType,
          as: 'employmentType',
          attributes: ['employment_type_id', 'employment_type_name', 'employment_type_code']
        }
      ]
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get leave balance
    const leaveTypes = await LeaveType.findAll();
    const year = new Date(from_date).getFullYear();

    const leaveData = await Leave.findAll({
      where: {
        employee_id: employee_id,
        status: { [Op.in]: ['Approved', 'Pending'] },
        [Op.or]: [
          sequelize.where(sequelize.fn('YEAR', sequelize.col('from_date')), year),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('to_date')), year)
        ]
      },
      attributes: [
        'leave_type_id',
        [sequelize.fn('SUM', sequelize.col('total_days')), 'total_used']
      ],
      group: ['leave_type_id']
    });

    const leaveBalance = leaveTypes.map(lt => {
      const used = leaveData.find(ld => ld.leave_type_id === lt.leave_type_id);
      const totalAllowed = parseFloat(lt.max_days_per_year) || 0;
      const totalUsed = parseFloat(used?.getDataValue('total_used')) || 0;

      return {
        leave_type_name: lt.leave_type_name,
        total_allowed: totalAllowed,
        total_used: totalUsed,
        balance: totalAllowed - totalUsed
      };
    });

    // Get leave taken in date range
    const leaveTaken = await Leave.findAll({
      where: {
        employee_id: employee_id,
        [Op.or]: [
          { from_date: { [Op.between]: [from_date, to_date] } },
          { to_date: { [Op.between]: [from_date, to_date] } }
        ]
      },
      include: [
        {
          model: LeaveType,
          as: 'leaveType',
          attributes: ['leave_type_name', 'leave_type_code']
        }
      ],
      order: [['from_date', 'DESC']]
    });

    // Get attendance records
    const attendance = await Attendance.findAll({
      where: {
        employee_id: employee_id,
        attendance_date: { [Op.between]: [from_date, to_date] }
      },
      order: [['attendance_date', 'DESC']]
    });

    // Calculate attendance summary
    const attendanceSummary = {
      present: attendance.filter(a => a.attendance_status === 'Present').length,
      absent: attendance.filter(a => a.attendance_status === 'Absent').length,
      leave: attendance.filter(a => a.attendance_status === 'Leave').length,
      holiday: attendance.filter(a => a.attendance_status === 'Holiday').length,
      late_entries: attendance.filter(a => 
        a.check_in_time && a.check_in_time > '09:30:00'
      ).length
    };

    // Prepare comprehensive report
    const report = {
      employee_details: {
        employee_id: employee.employee_id,
        employee_code: employee.employee_code,
        employee_name: employee.employee_name,
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        mobile: employee.mobile,
        date_of_birth: employee.date_of_birth,
        date_of_joining: employee.date_of_joining,
        gender: employee.gender,
        status: employee.status,
        
        // FIXED: All company/department/employment type details
        company_id: employee.company_id,
        company_name: employee.company?.company_name || 'N/A',
        company_code: employee.company?.company_code || 'N/A',
        
        department_id: employee.department_id,
        department_name: employee.department?.department_name || 'N/A',
        department_code: employee.department?.department_code || 'N/A',
        
        designation_id: employee.designation_id,
        designation_name: employee.designation?.designation_name || 'N/A',
        
        employment_type_id: employee.employment_type_id,
        employment_type_name: employee.employmentType?.employment_type_name || 'N/A',
        employment_type_code: employee.employmentType?.employment_type_code || 'N/A',
        
        pan_number: employee.pan_number,
        aadhar_number: employee.aadhar_number,
        uan_number: employee.uan_number,
        esic_number: employee.esic_number
      },
      leave_balance: leaveBalance,
      leave_taken: leaveTaken.map(l => ({
        leave_type: l.leaveType?.leave_type_name,
        from_date: l.from_date,
        to_date: l.to_date,
        total_days: l.total_days,
        reason: l.reason,
        status: l.status
      })),
      attendance_summary: attendanceSummary,
      attendance_details: attendance.map(a => ({
        date: a.attendance_date,
        status: a.attendance_status,
        check_in: a.check_in_time,
        check_out: a.check_out_time,
        total_hours: a.total_hours,
        is_late: a.check_in_time && a.check_in_time > '09:30:00'
      })),
      report_period: {
        from_date,
        to_date
      }
    };

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Get comprehensive report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comprehensive report',
      error: error.message
    });
  }
};

// ==========================================
// 7. EXPORT TO PDF
// ==========================================

// exports.exportEmployeeDetailsPDF = async (req, res) => {
//   try {
//     const { company_id, department_id, employment_type_id, status = 'Active' } = req.query;

//     // Build where clause
//     const whereClause = {};
//     if (company_id) whereClause.companyId = company_id;
//     if (department_id) whereClause.departmentId = department_id;
//     if (employment_type_id) whereClause.employmentTypeId = employment_type_id;
//     if (status) whereClause.status = status;

//     // Fetch employees from database
//     const employees = await Employee.findAll({
//       where: whereClause,
//       attributes: [
//         'id', 'employeeCode', 'firstName', 'lastName',
//         'officialEmail', 'mobileNumber', 'dateOfJoining',
//         'status', 'companyId', 'departmentId', 'designationId', 'employmentTypeId'
//       ],
//       include: [
//         {
//           model: Company,
//           as: 'company',
//           attributes: ['id', 'name'],
//           required: false
//         },
//         {
//           model: Department,
//           as: 'department',
//           attributes: ['id', 'name'],
//           required: false
//         },
//         {
//           model: Designation,
//           as: 'designation',
//           attributes: ['id', 'name'],
//           required: false
//         },
//         {
//           model: EmploymentType,
//           as: 'employmentType',
//           attributes: ['id', 'name'],
//           required: false
//         }
//       ],
//       order: [['firstName', 'ASC']]
//     });

//     // Create PDF
//     const doc = new PDFDocument({ 
//       size: 'A4', 
//       layout: 'landscape',
//       margin: 20,
//       bufferPages: true
//     });

//     // Set up response
//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', 'attachment; filename=employee_details.pdf');
//     doc.pipe(res);

//     // Add title
//     doc.fontSize(16).font('Helvetica-Bold')
//        .text('Employee Details Report', { align: 'center' });
//     doc.moveDown();
//     doc.fontSize(10)
//        .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
//     doc.moveDown();

//     // Define columns
//     const columns = [
//       { header: 'Code', width: 60 },
//       { header: 'Name', width: 120 },
//       { header: 'Company', width: 100 }, // Added Company column
//       { header: 'Department', width: 100 },
//       { header: 'Designation', width: 100 },
//       { header: 'Emp Type', width: 80 }, // Added Employment Type
//       { header: 'Email', width: 140 },
//       { header: 'Mobile', width: 80 }
//     ];

//     // Draw header
//     let x = 20;
//     let y = 100;
//     doc.font('Helvetica-Bold').fontSize(9);
    
//     columns.forEach(col => {
//       doc.text(col.header, x, y, { width: col.width });
//       x += col.width + 5;
//     });

//     // Draw header line
//     y += 15;
//     doc.moveTo(20, y).lineTo(810, y).stroke();
//     y += 10;

//     // Draw rows
//     doc.font('Helvetica').fontSize(8);
//     employees.forEach(emp => {
//       if (y > 500) {
//         doc.addPage();
//         y = 50;
        
//         // Redraw headers on new page
//         x = 20;
//         doc.font('Helvetica-Bold').fontSize(9);
//         columns.forEach(col => {
//           doc.text(col.header, x, y, { width: col.width });
//           x += col.width + 5;
//         });
//         doc.moveTo(20, y + 15).lineTo(810, y + 15).stroke();
//         y = 80;
//         doc.font('Helvetica').fontSize(8);
//       }

//       // Draw row
//       x = 20;
//       columns.forEach((col, i) => {
//         let value = '';
//         switch(i) {
//           case 0: value = emp.employeeCode || ''; break;
//           case 1: value = `${emp.firstName} ${emp.lastName || ''}`; break;
//           case 2: value = emp.company?.name || 'N/A'; break;
//           case 3: value = emp.department?.name || 'N/A'; break;
//           case 4: value = emp.designation?.name || 'N/A'; break;
//           case 5: value = emp.employmentType?.name || 'N/A'; break;
//           case 6: value = emp.officialEmail || ''; break;
//           case 7: value = emp.mobileNumber || ''; break;
//         }
//         doc.text(value, x, y, { width: col.width });
//         x += col.width + 5;
//       });

//       y += 20;
//     });

//     // Add footer
//     doc.font('Helvetica-Bold').fontSize(10);
//     doc.text(`Total Employees: ${employees.length}`, 20, y + 20);

//     // End document
//     doc.end();

//   } catch (error) {
//     console.error('Export PDF error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to export PDF',
//       error: error.message
//     });
//   }
// };
// ==========================================
// COMPREHENSIVE PDF EXPORT - ALL FIELDS
// ==========================================

exports.exportEmployeeDetailsPDF = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employment_type_id,
      status = 'Active'
    } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    // Build where clause
    const whereClause = {
      companyId: company_id,
      status: status
    };

    if (department_id) whereClause.departmentId = department_id;
    if (employment_type_id) whereClause.employmentTypeId = employment_type_id;

    // Fetch ALL employee fields
    const employees = await Employee.findAll({
      where: whereClause,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Designation,
          as: 'designation',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: EmploymentType,
          as: 'employmentType',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['firstName', 'ASC']]
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No employees found'
      });
    }

    // Create PDF in Portrait mode for more fields
    const doc = new PDFDocument({ 
      size: 'A4', 
      layout: 'portrait',
      margin: 30
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=employee_details_complete.pdf');
    doc.pipe(res);

    // Title
    doc.fontSize(16).font('Helvetica-Bold')
       .text('Complete Employee Details Report', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(9).font('Helvetica')
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(0.5);

    // Add summary
    doc.fontSize(9).font('Helvetica-Bold')
       .text(`Total Employees: ${employees.length}`, { align: 'left' });
    doc.moveDown(0.8);

    // Draw each employee as a card/section
    employees.forEach((emp, index) => {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage();
      }

      // Employee section border
      const startY = doc.y;
      const boxHeight = 200;

      // Draw box
      doc.rect(30, startY, 535, boxHeight).stroke();

      // Employee header with background
      doc.fillColor('#f0f0f0')
         .rect(30, startY, 535, 25)
         .fill();
      
      doc.fillColor('#000000')
         .fontSize(11)
         .font('Helvetica-Bold')
         .text(
           `${index + 1}. ${emp.employeeCode || 'N/A'} - ${emp.firstName || ''} ${emp.lastName || ''}`,
           40,
           startY + 7
         );

      let yPos = startY + 35;
      const leftCol = 40;
      const rightCol = 300;
      const lineHeight = 15;

      doc.fontSize(8).font('Helvetica');

      // LEFT COLUMN
      // Basic Info
      doc.font('Helvetica-Bold').text('Personal Information:', leftCol, yPos);
      yPos += lineHeight;
      doc.font('Helvetica');
      
      doc.text(`Email: `, leftCol, yPos, { continued: true })
         .font('Helvetica').text(emp.officialEmail || 'N/A');
      yPos += lineHeight;
      
      doc.font('Helvetica').text(`Mobile: `, leftCol, yPos, { continued: true })
         .text(emp.mobileNumber || 'N/A');
      yPos += lineHeight;
      
      doc.text(`Date of Birth: `, leftCol, yPos, { continued: true })
         .text(emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : 'N/A');
      yPos += lineHeight;
      
      doc.text(`Gender: `, leftCol, yPos, { continued: true })
         .text(emp.gender || 'N/A');
      yPos += lineHeight;
      
      doc.text(`Blood Group: `, leftCol, yPos, { continued: true })
         .text(emp.bloodGroup || 'N/A');
      yPos += lineHeight;
      
      doc.text(`Marital Status: `, leftCol, yPos, { continued: true })
         .text(emp.maritalStatus || 'N/A');
      yPos += lineHeight + 3;

      // Address
      doc.font('Helvetica-Bold').text('Address:', leftCol, yPos);
      yPos += lineHeight;
      doc.font('Helvetica');
      
      if (emp.addresses && typeof emp.addresses === 'object') {
        const addr = emp.addresses;
        const addressText = [
          addr.street,
          addr.city,
          addr.state,
          addr.postalCode,
          addr.country
        ].filter(Boolean).join(', ') || 'N/A';
        
        doc.text(addressText, leftCol, yPos, { width: 220 });
      } else {
        doc.text('N/A', leftCol, yPos);
      }

      // RIGHT COLUMN
      yPos = startY + 35;
      
      // Company Info
      doc.font('Helvetica-Bold').text('Company Information:', rightCol, yPos);
      yPos += lineHeight;
      doc.font('Helvetica');
      
      doc.text(`Company: `, rightCol, yPos, { continued: true })
         .text(emp.company?.name || 'N/A');
      yPos += lineHeight;
      
      doc.text(`Department: `, rightCol, yPos, { continued: true })
         .text(emp.department?.name || 'N/A');
      yPos += lineHeight;
      
      doc.text(`Designation: `, rightCol, yPos, { continued: true })
         .text(emp.designation?.name || 'N/A');
      yPos += lineHeight;
      
      doc.text(`Employment Type: `, rightCol, yPos, { continued: true })
         .text(emp.employmentType?.name || 'N/A');
      yPos += lineHeight;
      
      doc.text(`Date of Joining: `, rightCol, yPos, { continued: true })
         .text(emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : 'N/A');
      yPos += lineHeight;
      
      doc.text(`Status: `, rightCol, yPos, { continued: true })
         .text(emp.status || 'N/A');
      yPos += lineHeight + 3;

      // Statutory Info
      doc.font('Helvetica-Bold').text('Statutory Information:', rightCol, yPos);
      yPos += lineHeight;
      doc.font('Helvetica');
      
      doc.text(`PAN: `, rightCol, yPos, { continued: true })
         .text(emp.panNumber || 'N/A');
      yPos += lineHeight;
      
      doc.text(`Aadhar: `, rightCol, yPos, { continued: true })
         .text(emp.aadharNumber || 'N/A');
      yPos += lineHeight;
      
      doc.text(`UAN: `, rightCol, yPos, { continued: true })
         .text(emp.uanNumber || 'N/A');
      yPos += lineHeight;
      
      doc.text(`ESIC: `, rightCol, yPos, { continued: true })
         .text(emp.esicNumber || 'N/A');

      // Move to next employee
      doc.y = startY + boxHeight + 15;
    });

    // Footer on last page
    doc.fontSize(8).font('Helvetica')
       .text(`Report Generated: ${new Date().toLocaleString()}`, 30, doc.page.height - 50, {
         align: 'center'
       });

    doc.end();

  } catch (error) {
    console.error('Export PDF error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export PDF',
        error: error.message
      });
    }
  }
};
exports.exportEmployeeDetailsExcel = async (req, res) => {
  try {
    const {
      company_id,
      department_id,
      employment_type_id,
      status = 'Active'
    } = req.query;

    if (!company_id) {
      return res.status(400).json({
        success: false,
        message: 'Company ID is required'
      });
    }

    // Build where clause
    const whereClause = {
      companyId: company_id,
      status: status
    };

    if (department_id) whereClause.departmentId = department_id;
    if (employment_type_id) whereClause.employmentTypeId = employment_type_id;

    // Fetch ALL employee fields
    const employees = await Employee.findAll({
      where: whereClause,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: Designation,
          as: 'designation',
          attributes: ['id', 'name'],
          required: false
        },
        {
          model: EmploymentType,
          as: 'employmentType',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['firstName', 'ASC']]
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No employees found'
      });
    }

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HR System';
    workbook.created = new Date();

    // Create worksheet
    const worksheet = workbook.addWorksheet('Employee Details', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    // Define columns with ALL fields
    worksheet.columns = [
      { header: 'Employee Code', key: 'employeeCode', width: 15 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Full Name', key: 'fullName', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Mobile', key: 'mobile', width: 15 },
      { header: 'Date of Birth', key: 'dob', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Blood Group', key: 'bloodGroup', width: 12 },
      { header: 'Marital Status', key: 'maritalStatus', width: 15 },
      
      // Company Information
      { header: 'Company', key: 'company', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Employment Type', key: 'employmentType', width: 15 },
      { header: 'Date of Joining', key: 'doj', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      
      // Address
      { header: 'Address', key: 'address', width: 40 },
      
      // Statutory Information
      { header: 'PAN Number', key: 'pan', width: 15 },
      { header: 'Aadhar Number', key: 'aadhar', width: 15 },
      { header: 'UAN Number', key: 'uan', width: 15 },
      { header: 'ESIC Number', key: 'esic', width: 15 },
      
      // Bank Information
      { header: 'Bank Name', key: 'bankName', width: 20 },
      { header: 'Account Number', key: 'accountNumber', width: 20 },
      { header: 'IFSC Code', key: 'ifsc', width: 15 },
      
      // Emergency Contact
      { header: 'Emergency Contact Name', key: 'emergencyContactName', width: 20 },
      { header: 'Emergency Contact Number', key: 'emergencyContactNumber', width: 18 },
      { header: 'Emergency Contact Relation', key: 'emergencyContactRelation', width: 20 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true, size: 11 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 25;

    // Add data rows
    employees.forEach((emp, index) => {
      // Parse address if it's stored as JSON
      let addressText = 'N/A';
      if (emp.addresses) {
        if (typeof emp.addresses === 'string') {
          try {
            const addr = JSON.parse(emp.addresses);
            addressText = [
              addr.street,
              addr.city,
              addr.state,
              addr.postalCode,
              addr.country
            ].filter(Boolean).join(', ');
          } catch (e) {
            addressText = emp.addresses;
          }
        } else if (typeof emp.addresses === 'object') {
          const addr = emp.addresses;
          addressText = [
            addr.street,
            addr.city,
            addr.state,
            addr.postalCode,
            addr.country
          ].filter(Boolean).join(', ');
        }
      }

      const row = worksheet.addRow({
        employeeCode: emp.employeeCode || '',
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        email: emp.officialEmail || '',
        mobile: emp.mobileNumber || '',
        dob: emp.dateOfBirth ? new Date(emp.dateOfBirth) : '',
        gender: emp.gender || '',
        bloodGroup: emp.bloodGroup || '',
        maritalStatus: emp.maritalStatus || '',
        
        company: emp.company?.name || '',
        department: emp.department?.name || '',
        designation: emp.designation?.name || '',
        employmentType: emp.employmentType?.name || '',
        doj: emp.dateOfJoining ? new Date(emp.dateOfJoining) : '',
        status: emp.status || '',
        
        address: addressText,
        
        pan: emp.panNumber || '',
        aadhar: emp.aadharNumber || '',
        uan: emp.uanNumber || '',
        esic: emp.esicNumber || '',
        
        bankName: emp.bankName || '',
        accountNumber: emp.bankAccountNumber || '',
        ifsc: emp.ifscCode || '',
        
        emergencyContactName: emp.emergencyContactName || '',
        emergencyContactNumber: emp.emergencyContactNumber || '',
        emergencyContactRelation: emp.emergencyContactRelation || ''
      });

      // Format date columns
      if (emp.dateOfBirth) {
        row.getCell('dob').numFmt = 'dd/mm/yyyy';
      }
      if (emp.dateOfJoining) {
        row.getCell('doj').numFmt = 'dd/mm/yyyy';
      }

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' }
        };
      }

      // Center align specific columns
      row.getCell('gender').alignment = { horizontal: 'center' };
      row.getCell('bloodGroup').alignment = { horizontal: 'center' };
      row.getCell('status').alignment = { horizontal: 'center' };
    });

    // Add auto filter
    worksheet.autoFilter = {
      from: 'A1',
      to: worksheet.lastColumn.letter + '1'
    };

    // Freeze first row
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    // Add summary row at the bottom
    const summaryRow = worksheet.addRow({
      employeeCode: '',
      firstName: `TOTAL EMPLOYEES: ${employees.length}`,
      lastName: '',
      fullName: '',
      email: '',
      mobile: '',
      dob: '',
      gender: '',
      bloodGroup: '',
      maritalStatus: '',
      company: '',
      department: '',
      designation: '',
      employmentType: '',
      doj: '',
      status: '',
      address: '',
      pan: '',
      aadhar: '',
      uan: '',
      esic: '',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      emergencyContactRelation: ''
    });

    summaryRow.font = { bold: true, size: 11 };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE7E6E6' }
    };

    // Add a separate summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    
    summarySheet.mergeCells('A1:B1');
    summarySheet.getCell('A1').value = 'Employee Report Summary';
    summarySheet.getCell('A1').font = { bold: true, size: 14 };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };
    
    summarySheet.addRow([]);
    summarySheet.addRow(['Total Employees:', employees.length]);
    summarySheet.addRow(['Report Generated:', new Date().toLocaleString()]);
    summarySheet.addRow(['Company:', employees[0]?.company?.name || 'N/A']);
    
    // Count by status
    const activeCount = employees.filter(e => e.status === 'Active').length;
    const inactiveCount = employees.filter(e => e.status === 'Inactive').length;
    summarySheet.addRow([]);
    summarySheet.addRow(['Active Employees:', activeCount]);
    summarySheet.addRow(['Inactive Employees:', inactiveCount]);
    
    // Count by employment type
    const employmentTypeCounts = {};
    employees.forEach(emp => {
      const type = emp.employmentType?.name || 'Unknown';
      employmentTypeCounts[type] = (employmentTypeCounts[type] || 0) + 1;
    });
    
    summarySheet.addRow([]);
    summarySheet.addRow(['By Employment Type:']);
    Object.entries(employmentTypeCounts).forEach(([type, count]) => {
      summarySheet.addRow([type, count]);
    });
    
    // Count by department
    const deptCounts = {};
    employees.forEach(emp => {
      const dept = emp.department?.name || 'Unknown';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    
    summarySheet.addRow([]);
    summarySheet.addRow(['By Department:']);
    Object.entries(deptCounts).forEach(([dept, count]) => {
      summarySheet.addRow([dept, count]);
    });
    
    summarySheet.columns = [
      { width: 30 },
      { width: 15 }
    ];

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=employee_details_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Export Excel error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export Excel',
        error: error.message
      });
    }
  }
};

module.exports = exports;