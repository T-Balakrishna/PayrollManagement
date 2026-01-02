const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Employee = sequelize.define('Employee', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        // BASIC INFORMATION
        employeeCode: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        middleName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        lastName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        dateOfBirth: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        gender: {
            type: DataTypes.ENUM('Male', 'Female', 'Other'),
            allowNull: false,
        },
        bloodGroup: {
            type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'),
            allowNull: true,
        },
        maritalStatus: {
            type: DataTypes.ENUM('Single', 'Married', 'Divorced', 'Widowed'),
            allowNull: true,
        },
        profilePhoto: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        
        // CONTACT INFORMATION
        personalEmail: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true,
            },
        },
        officialEmail: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isEmail: true,
            },
        },
        mobileNumber: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        alternateMobile: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        emergencyContactName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        emergencyContactNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        emergencyContactRelationship: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        
        // CURRENT ADDRESS
        currentAddressLine1: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        currentAddressLine2: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        currentCity: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        currentState: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        currentPincode: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        currentCountry: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        
        // PERMANENT ADDRESS
        permanentAddressLine1: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        permanentAddressLine2: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        permanentCity: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        permanentState: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        permanentPincode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        permanentCountry: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        
        // EMPLOYMENT INFORMATION
        designationId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'designations',
                key: 'id',
            },
        },
        employmentTypeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'employment_types',
                key: 'id',
            },
        },
        employeeType: {
            type: DataTypes.ENUM('Permanent', 'Contract', 'Temporary', 'Intern'),
            allowNull: false,
        },
        dateOfJoining: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },
        confirmationDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        probationPeriod: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
            comment: 'Probation period in months',
        },
        reportingManagerId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'employees',
                key: 'id',
            },
        },
        workLocation: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        employmentStatus: {
            type: DataTypes.ENUM('Active', 'Resigned', 'Terminated', 'On Leave', 'Retired'),
            allowNull: false,
            defaultValue: 'Active',
        },
        
        // REFERENCE PERSON
        referencePersonName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        referencePersonContact: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        
        // SHIFT & ATTENDANCE
        shiftTypeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'shift_types',
                key: 'id',
            },
        },
        leavePolicyId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'leave_policies',
                key: 'id',
            },
        },
        weeklyOff: {
            type: DataTypes.ENUM('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
            allowNull: true,
            defaultValue: 'Sunday',
        },
        isOvertimeApplicable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isLeaveApplicable: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        biometricDeviceId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'biometric_devices',
                key: 'id',
            },
        },
        biometricEnrollmentId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        
        // SALARY & BANK
        basicSalary: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
        },
        bankName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bankAccountNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ifscCode: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bankBranch: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        paymentMode: {
            type: DataTypes.ENUM('Bank Transfer', 'Cash', 'Cheque'),
            allowNull: true,
            defaultValue: 'Bank Transfer',
        },
        panNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        uanNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        esiNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        
        // TRANSPORT & HOSTEL
        isTransportRequired: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        busId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'buses',
                key: 'id',
            },
        },
        pickupPoint: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        isHostel: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isTrainee: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        
        // DOCUMENTS
        aadhaarNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        passportNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        drivingLicenseNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        voterIdNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        
        // STATUS
        status: {
            type: DataTypes.ENUM('Active', 'Inactive'),
            allowNull: false,
            defaultValue: 'Active',
        },
        
        // FOREIGN KEYS
        companyId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'companies',
                key: 'id',
            },
            onDelete: 'CASCADE',
        },
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'departments',
                key: 'id',
            },
        },
        gradeId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'employer_grades',
                key: 'id',
            },
        },
    }, {
        tableName: 'employees',
        timestamps: true,
        hooks: {
            // Calculate age and retirement date before saving
            beforeValidate: (employee) => {
                if (employee.dateOfBirth) {
                    const dob = new Date(employee.dateOfBirth);
                    const retirementDate = new Date(dob);
                    retirementDate.setFullYear(dob.getFullYear() + 58);
                    employee.dateOfRetirement = retirementDate.toISOString().split('T')[0];
                }
            }
        },
    });
    Employee.associate = function(models) {
    Employee.hasMany(models.LeaveRequest, {
      foreignKey: 'employeeId',
      as: 'leaveRequests'
    });
    };
    // Add virtual field for age
    Employee.prototype.getAge = function() {
        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };
    
    // Add virtual field for retirement date
    Employee.prototype.getRetirementDate = function() {
        const birthDate = new Date(this.dateOfBirth);
        const retirementDate = new Date(birthDate);
        retirementDate.setFullYear(birthDate.getFullYear() + 58);
        return retirementDate.toISOString().split('T')[0];
    };
    
    // Add virtual field for full name
    Employee.prototype.getFullName = function() {
        return `${this.firstName} ${this.middleName ? this.middleName + ' ' : ''}${this.lastName}`;
    };

    // Force sync to update table structure (only in development)
    if (process.env.NODE_ENV === 'development') {
        Employee.sync({ alter: true }).then(() => {
            console.log('Employee table synced successfully');
        }).catch(err => {
            console.error('Error syncing Employee table:', err);
        });
    }

    return Employee;
};  