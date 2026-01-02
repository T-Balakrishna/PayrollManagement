const { Sequelize } = require('sequelize');
const config = require('../config/database');

// Create a new Sequelize instance
const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    logging: console.log, // Set to 'false' to disable logging SQL queries
});

const db = {};

// Import each model function and call it with `sequelize`
// This initializes the model and attaches it to the sequelize instance
db.GoogleAuth = require('./googleAuth')(sequelize, Sequelize.DataTypes);
db.Company = require('./Company')(sequelize);
db.Department = require('./Department')(sequelize, Sequelize.DataTypes);
db.Designation = require('./Designation')(sequelize, Sequelize.DataTypes); 
db.EmploymentType = require('./EmploymentType')(sequelize, Sequelize.DataTypes);
db.EmployerGrade = require('./EmployerGrade')(sequelize);
db.LeavePolicy = require('./LeavePolicy')(sequelize, Sequelize.DataTypes);
db.LeavePeriod = require('./LeavePeriod')(sequelize, Sequelize.DataTypes);
db.LeaveType = require('./LeaveType')(sequelize, Sequelize.DataTypes);
db.HolidayList = require('./HolidayList')(sequelize, Sequelize.DataTypes);
db.Holiday = require('./Holiday')(sequelize, Sequelize.DataTypes);
db.ShiftType = require('./ShiftType')(sequelize, Sequelize.DataTypes);
db.BiometricDevice = require('./BiometricDevice')(sequelize, Sequelize.DataTypes);
db.BiometricPunch = require('./BiometricPunch')(sequelize, Sequelize.DataTypes);
// Import Employee model
db.Employee = require('./Employee')(sequelize, Sequelize.DataTypes);
// Import Bus model
db.Bus = require('./Bus')(sequelize, Sequelize.DataTypes);
db.SalaryComponent = require('./SalaryComponent')(sequelize, Sequelize.DataTypes);
db.LeaveAllocation = require('./LeaveAllocation')(sequelize, Sequelize.DataTypes);
db.Formula = require('./Formula')(sequelize, Sequelize.DataTypes);
db.ShiftAssignment = require('./ShiftAssignment')(sequelize, Sequelize.DataTypes);

// ✅ NEW: Import Attendance Model
db.Attendance = require('./Attendance')(sequelize, Sequelize.DataTypes);

// ✅ NEW: Import User Model
db.User = require('./User')(sequelize, Sequelize.DataTypes);

// ✅ NEW: Import Employee Salary Models
db.EmployeeSalaryMaster = require('./EmployeeSalaryMaster')(sequelize, Sequelize.DataTypes);
db.EmployeeSalaryComponent = require('./EmployeeSalaryComponent')(sequelize, Sequelize.DataTypes);
db.SalaryRevisionHistory = require('./SalaryRevisionHistory')(sequelize, Sequelize.DataTypes);

// ⭐ NEW: Import Leave Request Models
db.LeaveRequest = require('./LeaveRequest')(sequelize, Sequelize.DataTypes);
db.LeaveApproval = require('./LeaveApproval')(sequelize, Sequelize.DataTypes);
db.LeaveRequestHistory = require('./LeaveRequestHistory')(sequelize, Sequelize.DataTypes);

db.SalaryGeneration = require('./SalaryGeneration')(sequelize, Sequelize.DataTypes);
db.SalaryGenerationDetail = require('./SalaryGenerationDetail')(sequelize, Sequelize.DataTypes);
db.EmployeeLoan = require('./EmployeeLoan')(sequelize, Sequelize.DataTypes);

// --- Set up the associations between models ---

// Company Associations
db.Company.hasMany(db.Department, { foreignKey: 'companyId', as: 'departments' });
db.Company.hasMany(db.LeavePeriod, { foreignKey: 'companyId', as: 'leavePeriods' });
db.Company.hasMany(db.LeaveType, { foreignKey: 'companyId', as: 'leaveTypes' });
db.Company.hasMany(db.HolidayList, { foreignKey: 'companyId', as: 'holidayLists' });
db.Company.hasMany(db.ShiftType, { foreignKey: 'companyId', as: 'shiftTypes' });

// Department Associations
db.Department.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

// Leave Period Associations
db.LeavePeriod.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

// Leave Type Associations
db.LeaveType.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

// Add Designation associations
db.Company.hasMany(db.Designation, { foreignKey: 'companyId' });
db.Designation.belongsTo(db.Company, { foreignKey: 'companyId' });

// Add EmploymentType associations
db.Company.hasMany(db.EmploymentType, { foreignKey: 'companyId' });
db.EmploymentType.belongsTo(db.Company, { foreignKey: 'companyId' });

// Add EmployerGrade associations
db.Company.hasMany(db.EmployerGrade, { foreignKey: 'companyId' });
db.EmployerGrade.belongsTo(db.Company, { foreignKey: 'companyId' });

// Add LeavePolicy associations
db.Company.hasMany(db.LeavePolicy, { foreignKey: 'companyId' });
db.LeavePolicy.belongsTo(db.Company, { foreignKey: 'companyId' });

// Add EmploymentType association with LeavePolicy
db.EmploymentType.hasMany(db.LeavePolicy, { foreignKey: 'employmentTypeId' });
db.LeavePolicy.belongsTo(db.EmploymentType, { foreignKey: 'employmentTypeId' });

// Holiday List Associations
db.HolidayList.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.HolidayList.hasMany(db.Holiday, { foreignKey: 'holidayListId', as: 'holidays' });
db.HolidayList.hasMany(db.ShiftType, { foreignKey: 'holidayListId', as: 'shifts' });

// Holiday Associations
db.Holiday.belongsTo(db.HolidayList, { foreignKey: 'holidayListId', as: 'holidayList' });

// Shift Type Associations
db.ShiftType.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.ShiftType.belongsTo(db.HolidayList, { foreignKey: 'holidayListId', as: 'holidayList' });

// Add Company → Bus association
db.Company.hasMany(db.Bus, { foreignKey: 'companyId', as: 'buses' });

// Add Bus → Company association
db.Bus.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

// Add Company → BiometricDevice association
db.Company.hasMany(db.BiometricDevice, { foreignKey: 'companyId', as: 'biometricDevices' });

// Add BiometricDevice → Company association
db.BiometricDevice.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

// Add all associations
db.Company.hasMany(db.Designation, { foreignKey: 'companyId', as: 'designations' });
db.Designation.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.Company.hasMany(db.EmploymentType, { foreignKey: 'companyId', as: 'employmentTypes' });
db.EmploymentType.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.Company.hasMany(db.LeavePolicy, { foreignKey: 'companyId', as: 'leavePolicies' });
db.LeavePolicy.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.Company.hasMany(db.Employee, { foreignKey: 'companyId', as: 'employees' });
db.Employee.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees' });
db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

db.Designation.hasMany(db.Employee, { foreignKey: 'designationId', as: 'employees' });
db.Employee.belongsTo(db.Designation, { foreignKey: 'designationId', as: 'designation' });

db.EmploymentType.hasMany(db.Employee, { foreignKey: 'employmentTypeId', as: 'employees' });
db.Employee.belongsTo(db.EmploymentType, { foreignKey: 'employmentTypeId', as: 'employmentType' });

// Add EmployerGrade association with Employee
db.EmployerGrade.hasMany(db.Employee, { foreignKey: 'gradeId', as: 'employees' });
db.Employee.belongsTo(db.EmployerGrade, { foreignKey: 'gradeId', as: 'grade' });

db.ShiftType.hasMany(db.Employee, { foreignKey: 'shiftTypeId', as: 'employees' });
db.Employee.belongsTo(db.ShiftType, { foreignKey: 'shiftTypeId', as: 'shiftType' });

db.LeavePolicy.hasMany(db.Employee, { foreignKey: 'leavePolicyId', as: 'employees' });
db.Employee.belongsTo(db.LeavePolicy, { foreignKey: 'leavePolicyId', as: 'leavePolicy' });

db.BiometricDevice.hasMany(db.Employee, { foreignKey: 'biometricDeviceId', as: 'employees' });
db.Employee.belongsTo(db.BiometricDevice, { foreignKey: 'biometricDeviceId', as: 'biometricDevice' });

db.Bus.hasMany(db.Employee, { foreignKey: 'busId', as: 'employees' });
db.Employee.belongsTo(db.Bus, { foreignKey: 'busId', as: 'bus' });

// Self-reference for reporting manager
db.Employee.belongsTo(db.Employee, { foreignKey: 'reportingManagerId', as: 'reportingManager' });
db.Employee.hasMany(db.Employee, { foreignKey: 'reportingManagerId', as: 'subordinates' });

// Associations for leave allocations
db.Company.hasMany(db.LeaveAllocation, { foreignKey: 'companyId', as: 'leaveAllocations' });
db.LeaveAllocation.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.Employee.hasMany(db.LeaveAllocation, { foreignKey: 'employeeId', as: 'leaveAllocations' });
db.LeaveAllocation.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

db.LeaveType.hasMany(db.LeaveAllocation, { foreignKey: 'leaveTypeId', as: 'leaveAllocations' });
db.LeaveAllocation.belongsTo(db.LeaveType, { foreignKey: 'leaveTypeId', as: 'leaveType' });

db.LeavePeriod.hasMany(db.LeaveAllocation, { foreignKey: 'leavePeriodId', as: 'leaveAllocations' });
db.LeaveAllocation.belongsTo(db.LeavePeriod, { foreignKey: 'leavePeriodId', as: 'leavePeriod' });

// Add SalaryComponent associations
db.Company.hasMany(db.SalaryComponent, { foreignKey: 'companyId' });
db.SalaryComponent.belongsTo(db.Company, { foreignKey: 'companyId' });

// Formula associations
db.Company.hasMany(db.Formula, { foreignKey: 'companyId' });
db.Formula.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Formula.belongsTo(db.SalaryComponent, { 
    foreignKey: 'targetComponentId',
    as: 'targetComponent' // Add this alias for better query results
});
db.SalaryComponent.hasMany(db.Formula, { foreignKey: 'targetComponentId' });

// ✅ NEW: Employee Salary Master Associations
db.EmployeeSalaryMaster.belongsTo(db.Employee, { foreignKey: 'employeeId' });
db.Employee.hasMany(db.EmployeeSalaryMaster, { foreignKey: 'employeeId' });

db.EmployeeSalaryMaster.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Company.hasMany(db.EmployeeSalaryMaster, { foreignKey: 'companyId' });

// BiometricPunch associations
db.BiometricPunch.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasMany(db.BiometricPunch, { foreignKey: 'employeeId', as: 'punches' });

db.BiometricPunch.belongsTo(db.BiometricDevice, { foreignKey: 'biometricDeviceId', as: 'device' });
db.BiometricDevice.hasMany(db.BiometricPunch, { foreignKey: 'biometricDeviceId', as: 'punches' });

db.BiometricPunch.belongsTo(db.ShiftType, { foreignKey: 'shiftTypeId', as: 'shift' });
db.ShiftType.hasMany(db.BiometricPunch, { foreignKey: 'shiftTypeId', as: 'punches' });

db.BiometricPunch.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.Company.hasMany(db.BiometricPunch, { foreignKey: 'companyId', as: 'punches' });

// Self-reference for previous salary
db.EmployeeSalaryMaster.belongsTo(db.EmployeeSalaryMaster, { 
    foreignKey: 'previousSalaryId', 
    as: 'previousSalary' 
});
db.EmployeeSalaryMaster.hasMany(db.EmployeeSalaryMaster, { 
    foreignKey: 'previousSalaryId', 
    as: 'nextSalaries' 
});

// ✅ NEW: Employee Salary Component Associations
db.EmployeeSalaryMaster.hasMany(db.EmployeeSalaryComponent, { 
    foreignKey: 'employeeSalaryMasterId' 
});
db.EmployeeSalaryComponent.belongsTo(db.EmployeeSalaryMaster, { 
    foreignKey: 'employeeSalaryMasterId' 
});

db.EmployeeSalaryComponent.belongsTo(db.SalaryComponent, { 
    foreignKey: 'componentId' 
});
db.SalaryComponent.hasMany(db.EmployeeSalaryComponent, { 
    foreignKey: 'componentId' 
});

db.EmployeeSalaryComponent.belongsTo(db.Formula, { 
    foreignKey: 'formulaId' 
});
db.Formula.hasMany(db.EmployeeSalaryComponent, { 
    foreignKey: 'formulaId' 
});

// ✅ NEW: Salary Revision History Associations
db.SalaryRevisionHistory.belongsTo(db.Employee, { foreignKey: 'employeeId' });
db.Employee.hasMany(db.SalaryRevisionHistory, { foreignKey: 'employeeId' });

db.SalaryRevisionHistory.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Company.hasMany(db.SalaryRevisionHistory, { foreignKey: 'companyId' });

db.SalaryRevisionHistory.belongsTo(db.EmployeeSalaryMaster, { 
    foreignKey: 'oldSalaryMasterId', 
    as: 'oldSalary' 
});

db.SalaryRevisionHistory.belongsTo(db.EmployeeSalaryMaster, { 
    foreignKey: 'newSalaryMasterId', 
    as: 'newSalary' 
});

// ⭐ NEW: Leave Request Associations
// LeaveRequest → Employee
db.LeaveRequest.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'Employee' });
db.Employee.hasMany(db.LeaveRequest, { foreignKey: 'employeeId', as: 'leaveRequests' });

// LeaveRequest → LeaveType
db.LeaveRequest.belongsTo(db.LeaveType, { foreignKey: 'leaveTypeId' });
db.LeaveType.hasMany(db.LeaveRequest, { foreignKey: 'leaveTypeId', as: 'leaveRequests' });

// LeaveRequest → LeaveAllocation
db.LeaveRequest.belongsTo(db.LeaveAllocation, { foreignKey: 'leaveAllocationId' });
db.LeaveAllocation.hasMany(db.LeaveRequest, { foreignKey: 'leaveAllocationId', as: 'leaveRequests' });

// LeaveRequest → Company
db.LeaveRequest.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Company.hasMany(db.LeaveRequest, { foreignKey: 'companyId', as: 'leaveRequests' });

// LeaveRequest → LeaveApproval (One-to-Many)
db.LeaveRequest.hasMany(db.LeaveApproval, { foreignKey: 'leaveRequestId' });
db.LeaveApproval.belongsTo(db.LeaveRequest, { foreignKey: 'leaveRequestId' });

// LeaveRequest → LeaveRequestHistory (One-to-Many)
db.LeaveRequest.hasMany(db.LeaveRequestHistory, { foreignKey: 'leaveRequestId' });
db.LeaveRequestHistory.belongsTo(db.LeaveRequest, { foreignKey: 'leaveRequestId' });

// LeaveApproval → Employee (Approver)
db.LeaveApproval.belongsTo(db.Employee, { foreignKey: 'approverId', as: 'Approver' });
db.Employee.hasMany(db.LeaveApproval, { foreignKey: 'approverId', as: 'approvals' });

// LeaveApproval → Company
db.LeaveApproval.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Company.hasMany(db.LeaveApproval, { foreignKey: 'companyId', as: 'leaveApprovals' });

// LeaveRequestHistory → Employee (ActionBy)
db.LeaveRequestHistory.belongsTo(db.Employee, { foreignKey: 'actionBy', as: 'ActionBy' });
db.Employee.hasMany(db.LeaveRequestHistory, { foreignKey: 'actionBy', as: 'leaveActions' });

// LeaveRequestHistory → Company
db.LeaveRequestHistory.belongsTo(db.Company, { foreignKey: 'companyId' });
db.Company.hasMany(db.LeaveRequestHistory, { foreignKey: 'companyId', as: 'leaveHistory' });

// ShiftAssignment Associations
db.ShiftAssignment.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.Company.hasMany(db.ShiftAssignment, { foreignKey: 'companyId', as: 'shiftAssignments' });

db.ShiftAssignment.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasMany(db.ShiftAssignment, { foreignKey: 'employeeId', as: 'shiftAssignments' });

db.ShiftAssignment.belongsTo(db.ShiftType, { foreignKey: 'shiftTypeId', as: 'shiftType' });
db.ShiftType.hasMany(db.ShiftAssignment, { foreignKey: 'shiftTypeId', as: 'shiftAssignments' });

// ⭐⭐⭐ NEW: Attendance Associations ⭐⭐⭐

// Attendance → Employee
db.Attendance.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasMany(db.Attendance, { foreignKey: 'employeeId', as: 'attendances' });

// Attendance → ShiftAssignment
db.Attendance.belongsTo(db.ShiftAssignment, { foreignKey: 'shiftAssignmentId', as: 'shiftAssignment' });
db.ShiftAssignment.hasMany(db.Attendance, { foreignKey: 'shiftAssignmentId', as: 'attendances' });

// Attendance → ShiftType
db.Attendance.belongsTo(db.ShiftType, { foreignKey: 'shiftTypeId', as: 'shiftType' });
db.ShiftType.hasMany(db.Attendance, { foreignKey: 'shiftTypeId', as: 'attendances' });

// Attendance → Company
db.Attendance.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.Company.hasMany(db.Attendance, { foreignKey: 'companyId', as: 'attendances' });

// ⭐⭐⭐ NEW: User Model Associations ⭐⭐⭐

// User → Company
db.User.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });
db.Company.hasMany(db.User, { foreignKey: 'companyId', as: 'users' });

// User → Department
db.User.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });
db.Department.hasMany(db.User, { foreignKey: 'departmentId', as: 'users' });

// User → Employee (optional link)
db.User.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasOne(db.User, { foreignKey: 'employeeId', as: 'user' });

// User self-references for createdBy/updatedBy
db.User.belongsTo(db.User, { foreignKey: 'createdBy', as: 'creator' });
db.User.hasMany(db.User, { foreignKey: 'createdBy', as: 'createdUsers' });

db.User.belongsTo(db.User, { foreignKey: 'updatedBy', as: 'updater' });
db.User.hasMany(db.User, { foreignKey: 'updatedBy', as: 'updatedUsers' });

// Attendance → User (Approver and other user references)
db.Attendance.belongsTo(db.User, { foreignKey: 'approvedBy', as: 'approver' });
db.User.hasMany(db.Attendance, { foreignKey: 'approvedBy', as: 'approvedAttendances' });

db.Attendance.belongsTo(db.User, { foreignKey: 'createdBy', as: 'creator' });
db.User.hasMany(db.Attendance, { foreignKey: 'createdBy', as: 'createdAttendances' });

db.Attendance.belongsTo(db.User, { foreignKey: 'updatedBy', as: 'updater' });
db.User.hasMany(db.Attendance, { foreignKey: 'updatedBy', as: 'updatedAttendances' });

// ShiftAssignment → User (for createdBy/updatedBy)
db.ShiftAssignment.belongsTo(db.User, { foreignKey: 'createdBy', as: 'creator' });
db.User.hasMany(db.ShiftAssignment, { foreignKey: 'createdBy', as: 'createdShiftAssignments' });

db.ShiftAssignment.belongsTo(db.User, { foreignKey: 'updatedBy', as: 'updater' });
db.User.hasMany(db.ShiftAssignment, { foreignKey: 'updatedBy', as: 'updatedShiftAssignments' });


//salary association
db.SalaryGeneration.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
db.Employee.hasMany(db.SalaryGeneration, { foreignKey: 'employeeId', as: 'salaries' });

db.SalaryGeneration.belongsTo(db.EmployeeSalaryMaster, { foreignKey: 'employeeSalaryMasterId', as: 'salaryMaster' });

db.SalaryGeneration.belongsTo(db.Company, { foreignKey: 'companyId', as: 'company' });

db.SalaryGeneration.belongsTo(db.User, { foreignKey: 'generatedBy', as: 'generator' });
db.SalaryGeneration.belongsTo(db.User, { foreignKey: 'approvedBy', as: 'approver' });
db.SalaryGeneration.belongsTo(db.User, { foreignKey: 'paidBy', as: 'payer' });

db.SalaryGeneration.hasMany(db.SalaryGenerationDetail, { foreignKey: 'salaryGenerationId', as: 'details' });
db.SalaryGenerationDetail.belongsTo(db.SalaryGeneration, { foreignKey: 'salaryGenerationId' });

db.SalaryGenerationDetail.belongsTo(db.SalaryComponent, { foreignKey: 'componentId' });

// ==========================================
// EmployeeLoan Associations
// ==========================================

// EmployeeLoan → Employee (Loan holder)
db.EmployeeLoan.belongsTo(db.Employee, { 
    foreignKey: 'employeeId', 
    as: 'employee' 
});
db.Employee.hasMany(db.EmployeeLoan, { 
    foreignKey: 'employeeId', 
    as: 'loans' 
});

// EmployeeLoan → Employee (Approver)
db.EmployeeLoan.belongsTo(db.Employee, { 
    foreignKey: 'approvedBy', 
    as: 'approver' 
});
db.Employee.hasMany(db.EmployeeLoan, { 
    foreignKey: 'approvedBy', 
    as: 'approvedLoans' 
});

// EmployeeLoan → Company (via Employee relationship)
// This is implicit through the employee, but you can add explicit if needed
db.EmployeeLoan.belongsTo(db.Company, { 
    foreignKey: 'companyId', 
    as: 'company' 
});
db.Company.hasMany(db.EmployeeLoan, { 
    foreignKey: 'companyId', 
    as: 'employeeLoans' 
});

// Attendance → User (Approver) - Assuming you have a User model
// If you don't have a User model, you can comment out these associations
// db.Attendance.belongsTo(db.User, { foreignKey: 'approvedBy', as: 'approver' });
// db.User.hasMany(db.Attendance, { foreignKey: 'approvedBy', as: 'approvedAttendances' });

// db.Attendance.belongsTo(db.User, { foreignKey: 'createdBy', as: 'creator' });
// db.User.hasMany(db.Attendance, { foreignKey: 'createdBy', as: 'createdAttendances' });

// db.Attendance.belongsTo(db.User, { foreignKey: 'updatedBy', as: 'updater' });
// db.User.hasMany(db.Attendance, { foreignKey: 'updatedBy', as: 'updatedAttendances' });

// Attach the sequelize instance and Sequelize library to the db object
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;