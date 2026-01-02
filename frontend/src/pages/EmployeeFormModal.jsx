import React, { useState, useEffect } from 'react';

const EmployeeFormModal = ({ employee, companyId, companyName, masterData, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [formData, setFormData] = useState({
        // Basic Info
        employeeCode: '',
        firstName: '',
        middleName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        bloodGroup: '',
        maritalStatus: '',
        profilePhoto: '',
        isTrainee: false,
        isHostel: false,
        
        // Contact & Address
        personalEmail: '',
        officialEmail: '',
        mobileNumber: '',
        alternateMobile: '',
        emergencyContactName: '',
        emergencyContactNumber: '',
        emergencyContactRelationship: '',
        currentAddressLine1: '',
        currentAddressLine2: '',
        currentCity: '',
        currentState: '',
        currentPincode: '',
        currentCountry: 'India',
        permanentAddressLine1: '',
        permanentAddressLine2: '',
        permanentCity: '',
        permanentState: '',
        permanentPincode: '',
        permanentCountry: 'India',
        
        // Employment Details
        departmentId: '',
        designationId: '',
        gradeId: '',
        employmentTypeId: '',
        employeeType: 'Permanent',
        dateOfJoining: '',
        confirmationDate: '',
        probationPeriod: 0,
        reportingManagerId: '',
        workLocation: '',
        employmentStatus: 'Active',
        referencePersonName: '',
        referencePersonContact: '',
        
        // Shift & Attendance
        shiftTypeId: '',
        leavePolicyId: '',
        weeklyOff: 'Sunday',
        isOvertimeApplicable: false,
        isLeaveApplicable: true,
        biometricDeviceId: '',
        biometricEnrollmentId: '',
        
        // Salary & Bank
        basicSalary: 0,
        bankName: '',
        bankAccountNumber: '',
        ifscCode: '',
        bankBranch: '',
        paymentMode: 'Bank Transfer',
        panNumber: '',
        uanNumber: '',
        esiNumber: '',
        
        // Transport & Hostel
        isTransportRequired: false,
        busId: '',
        pickupPoint: '',
        
        // Documents
        aadhaarNumber: '',
        passportNumber: '',
        drivingLicenseNumber: '',
        voterIdNumber: '',
        
        status: 'Active'
    });

    // Computed fields
    const [age, setAge] = useState('');
    const [retirementDate, setRetirementDate] = useState('');

    useEffect(() => {
        if (employee) {
            setFormData({...employee});
        }
    }, [employee]);

    useEffect(() => {
        if (formData.dateOfBirth) {
            calculateAgeAndRetirement(formData.dateOfBirth);
        }
    }, [formData.dateOfBirth]);

    const calculateAgeAndRetirement = (dob) => {
        const birthDate = new Date(dob);
        const today = new Date();
        
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
        }
        setAge(`${calculatedAge} years`);

        const retirement = new Date(birthDate);
        retirement.setFullYear(birthDate.getFullYear() + 58);
        setRetirementDate(retirement.toISOString().split('T')[0]);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSameAsCurrentAddress = (e) => {
        if (e.target.checked) {
            setFormData(prev => ({
                ...prev,
                permanentAddressLine1: prev.currentAddressLine1,
                permanentAddressLine2: prev.currentAddressLine2,
                permanentCity: prev.currentCity,
                permanentState: prev.currentState,
                permanentPincode: prev.currentPincode,
                permanentCountry: prev.currentCountry
            }));
        }
    };

    const validateCurrentTab = () => {
        switch (activeTab) {
            case 0: // Basic Info
                if (!formData.employeeCode || !formData.firstName || !formData.lastName || 
                    !formData.dateOfBirth || !formData.gender) {
                    window.alert('Please fill all required fields in Basic Info tab');
                    return false;
                }
                break;
            case 1: // Contact & Address
                if (!formData.personalEmail || !formData.mobileNumber || 
                    !formData.currentAddressLine1 || !formData.currentCity || 
                    !formData.currentState || !formData.currentPincode || !formData.currentCountry) {
                    window.alert('Please fill all required fields in Contact & Address tab');
                    return false;
                }
                break;
            case 2: // Employment Details
                if (!formData.departmentId || !formData.designationId || 
                    !formData.employmentTypeId || !formData.dateOfJoining) {
                    window.alert('Please fill all required fields in Employment tab');
                    return false;
                }
                break;
            default:
                return true;
        }
        return true;
    };

    const handleNextTab = () => {
        if (validateCurrentTab()) {
            if (activeTab < tabs.length - 1) {
                setActiveTab(activeTab + 1);
            }
        }
    };

    const handlePreviousTab = () => {
        if (activeTab > 0) {
            setActiveTab(activeTab - 1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate all required fields across all tabs
        const requiredFields = {
            'Employee Code': formData.employeeCode,
            'First Name': formData.firstName,
            'Last Name': formData.lastName,
            'Date of Birth': formData.dateOfBirth,
            'Gender': formData.gender,
            'Personal Email': formData.personalEmail,
            'Mobile Number': formData.mobileNumber,
            'Current Address': formData.currentAddressLine1,
            'City': formData.currentCity,
            'State': formData.currentState,
            'Pincode': formData.currentPincode,
            'Country': formData.currentCountry,
            'Department': formData.departmentId,
            'Designation': formData.designationId,
            'Employment Type': formData.employmentTypeId,
            'Date of Joining': formData.dateOfJoining
        };

        const missingFields = Object.entries(requiredFields)
            .filter(([_, value]) => !value)
            .map(([field, _]) => field);

        if (missingFields.length > 0) {
            window.alert(`Please fill the following required fields:\n\n${missingFields.join('\n')}`);
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const url = employee 
                ? `/api/employees/${employee.id}` 
                : '/api/employees';
            const method = employee ? 'PUT' : 'POST';
            
            // Clean the payload - convert empty strings to null for optional fields
            const payload = { ...formData, companyId };
            
            // Foreign key fields - convert empty string to null
            const foreignKeyFields = [
                'reportingManagerId', 'shiftTypeId', 'leavePolicyId', 
                'biometricDeviceId', 'busId'
            ];
            
            foreignKeyFields.forEach(field => {
                if (payload[field] === '' || payload[field] === undefined) {
                    payload[field] = null;
                }
            });
            
            // Optional text fields - convert empty string to null
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
                if (payload[field] === '') {
                    payload[field] = null;
                }
            });

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to save employee');
            }

            if (onSave) onSave();
        } catch (err) {
            window.alert('Error: ' + err.message);
        }
    };

    const tabs = [
        { id: 0, label: '📋 Basic Info', icon: '📋' },
        { id: 1, label: '📞 Contact & Address', icon: '📞' },
        { id: 2, label: '💼 Employment', icon: '💼' },
        { id: 3, label: '⏰ Shift & Attendance', icon: '⏰' },
        { id: 4, label: '💰 Salary & Bank', icon: '💰' },
        { id: 5, label: '🚌 Transport', icon: '🚌' },
        { id: 6, label: '📄 Documents', icon: '📄' }
    ];

    // Helper function to check if a tab has all required fields filled
    const getTabStatus = (tabId) => {
        switch (tabId) {
            case 0: // Basic Info - Required fields
                return formData.employeeCode && formData.firstName && 
                       formData.lastName && formData.dateOfBirth && formData.gender ? '✓' : '⚠️';
            case 1: // Contact & Address - Required fields
                return formData.personalEmail && formData.mobileNumber && 
                       formData.currentAddressLine1 && formData.currentCity &&
                       formData.currentState && formData.currentPincode && formData.currentCountry ? '✓' : '⚠️';
            case 2: // Employment - Required fields
                return formData.departmentId && formData.designationId && 
                       formData.employmentTypeId && formData.dateOfJoining ? '✓' : '⚠️';
            case 3: // Shift & Attendance - Optional
                return ''; // No required fields
            case 4: // Salary & Bank - Optional
                return ''; // No required fields
            case 5: // Transport - Optional
                return ''; // No required fields
            case 6: // Documents - Optional
                return ''; // No required fields
            default:
                return '';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <span className="text-3xl">{employee ? '✏️' : '➕'}</span>
                                {employee ? 'Edit Employee' : 'Add New Employee'}
                            </h2>
                            <p className="text-blue-100 mt-1 text-sm">Fill in the employee details across different sections</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                        >
                            <span className="text-2xl">✕</span>
                        </button>
                    </div>
                    {/* Progress Indicator */}
                    <div className="mt-4 flex items-center gap-3">
                        <span className="text-sm opacity-90 font-medium">Required Fields Progress:</span>
                        <div className="flex-1 h-2.5 bg-white bg-opacity-30 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-white transition-all duration-300 rounded-full"
                                style={{ width: `${(([0,1,2].filter(id => getTabStatus(id) === '✓').length) / 3) * 100}%` }}
                            ></div>
                        </div>
                        <span className="text-sm font-bold min-w-fit bg-white bg-opacity-20 px-3 py-1 rounded-full">
                            {[0,1,2].filter(id => getTabStatus(id) === '✓').length}/3
                        </span>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-slate-200 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-2 border-b-4 ${
                                activeTab === tab.id
                                    ? 'bg-white text-blue-600 border-blue-600 shadow-sm'
                                    : 'text-slate-600 border-transparent hover:text-blue-600 hover:bg-white hover:bg-opacity-50'
                            }`}
                        >
                            <span>{tab.label}</span>
                            {getTabStatus(tab.id) && (
                                <span 
                                    className={`text-base ${getTabStatus(tab.id) === '✓' ? 'text-green-600' : 'text-orange-500'}`}
                                    title={getTabStatus(tab.id) === '✓' ? 'Required fields completed' : 'Required fields incomplete'}
                                >
                                    {getTabStatus(tab.id)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-slate-50 to-white">
                        
                        {/* TAB 0: Basic Info */}
                        {activeTab === 0 && (
                            <div className="grid grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                                    <input 
                                        type="text" 
                                        value={companyName} 
                                        disabled 
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Employee Code <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        name="employeeCode" 
                                        value={formData.employeeCode} 
                                        onChange={handleInputChange} 
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">First Name <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        name="firstName" 
                                        value={formData.firstName} 
                                        onChange={handleInputChange} 
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Middle Name</label>
                                    <input 
                                        type="text" 
                                        name="middleName" 
                                        value={formData.middleName || ''} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        name="lastName" 
                                        value={formData.lastName} 
                                        onChange={handleInputChange} 
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth <span className="text-red-500">*</span></label>
                                    <input 
                                        type="date" 
                                        name="dateOfBirth" 
                                        value={formData.dateOfBirth} 
                                        onChange={handleInputChange} 
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Age (Auto)</label>
                                    <input 
                                        type="text" 
                                        value={age} 
                                        disabled
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Gender <span className="text-red-500">*</span></label>
                                    <select 
                                        name="gender" 
                                        value={formData.gender} 
                                        onChange={handleInputChange} 
                                        required
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Blood Group</label>
                                    <select 
                                        name="bloodGroup" 
                                        value={formData.bloodGroup} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Marital Status</label>
                                    <select 
                                        name="maritalStatus" 
                                        value={formData.maritalStatus} 
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="Single">Single</option>
                                        <option value="Married">Married</option>
                                        <option value="Divorced">Divorced</option>
                                        <option value="Widowed">Widowed</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 pt-8">
                                    <input 
                                        type="checkbox" 
                                        id="isTrainee" 
                                        name="isTrainee" 
                                        checked={formData.isTrainee} 
                                        onChange={handleInputChange}
                                        className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500"
                                    />
                                    <label htmlFor="isTrainee" className="text-sm font-medium text-slate-700 cursor-pointer">Is Trainee</label>
                                </div>
                                <div className="flex items-center gap-3 pt-8">
                                    <input 
                                        type="checkbox" 
                                        id="isHostel" 
                                        name="isHostel" 
                                        checked={formData.isHostel} 
                                        onChange={handleInputChange}
                                        className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500"
                                    />
                                    <label htmlFor="isHostel" className="text-sm font-medium text-slate-700 cursor-pointer">Is Hostel</label>
                                </div>
                            </div>
                        )}

                        {/* TAB 1: Contact & Address */}
                        {activeTab === 1 && (
                            <div className="space-y-8">
                                {/* Contact Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                                        <span className="text-2xl">📞</span>
                                        <h3 className="text-lg font-bold text-slate-800">Contact Information</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Personal Email <span className="text-red-500">*</span></label>
                                            <input 
                                                type="email" 
                                                name="personalEmail" 
                                                value={formData.personalEmail} 
                                                onChange={handleInputChange} 
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Official Email</label>
                                            <input 
                                                type="email" 
                                                name="officialEmail" 
                                                value={formData.officialEmail} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile Number <span className="text-red-500">*</span></label>
                                            <input 
                                                type="tel" 
                                                name="mobileNumber" 
                                                value={formData.mobileNumber} 
                                                onChange={handleInputChange} 
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Alternate Mobile</label>
                                            <input 
                                                type="tel" 
                                                name="alternateMobile" 
                                                value={formData.alternateMobile} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Name</label>
                                            <input 
                                                type="text" 
                                                name="emergencyContactName" 
                                                value={formData.emergencyContactName} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Number</label>
                                            <input 
                                                type="tel" 
                                                name="emergencyContactNumber" 
                                                value={formData.emergencyContactNumber} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Emergency Contact Relationship</label>
                                            <input 
                                                type="text" 
                                                name="emergencyContactRelationship" 
                                                value={formData.emergencyContactRelationship} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Current Address Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                                        <span className="text-2xl">📍</span>
                                        <h3 className="text-lg font-bold text-slate-800">Current Address</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="col-span-3">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 1 <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                name="currentAddressLine1" 
                                                value={formData.currentAddressLine1} 
                                                onChange={handleInputChange} 
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 2</label>
                                            <input 
                                                type="text" 
                                                name="currentAddressLine2" 
                                                value={formData.currentAddressLine2} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">City <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                name="currentCity" 
                                                value={formData.currentCity} 
                                                onChange={handleInputChange} 
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">State <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                name="currentState" 
                                                value={formData.currentState} 
                                                onChange={handleInputChange} 
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Pincode <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                name="currentPincode" 
                                                value={formData.currentPincode} 
                                                onChange={handleInputChange} 
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Country <span className="text-red-500">*</span></label>
                                            <input 
                                                type="text" 
                                                name="currentCountry" 
                                                value={formData.currentCountry} 
                                                onChange={handleInputChange} 
                                                required
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Permanent Address Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                                        <span className="text-2xl">🏠</span>
                                        <h3 className="text-lg font-bold text-slate-800">Permanent Address</h3>
                                    </div>
                                    <div className="mb-4">
                                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                id="sameAsCurrentAddress" 
                                                onChange={handleSameAsCurrentAddress}
                                                className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Same as Current Address</span>
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="col-span-3">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 1</label>
                                            <input 
                                                type="text" 
                                                name="permanentAddressLine1" 
                                                value={formData.permanentAddressLine1} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 2</label>
                                            <input 
                                                type="text" 
                                                name="permanentAddressLine2" 
                                                value={formData.permanentAddressLine2} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                                            <input 
                                                type="text" 
                                                name="permanentCity" 
                                                value={formData.permanentCity} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">State</label>
                                            <input 
                                                type="text" 
                                                name="permanentState" 
                                                value={formData.permanentState} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Pincode</label>
                                            <input 
                                                type="text" 
                                                name="permanentPincode" 
                                                value={formData.permanentPincode} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Country</label>
                                            <input 
                                                type="text" 
                                                name="permanentCountry" 
                                                value={formData.permanentCountry} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: Employment Details */}
                        {activeTab === 2 && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Department <span className="text-red-500">*</span></label>
                                        <select 
                                            name="departmentId" 
                                            value={formData.departmentId} 
                                            onChange={handleInputChange} 
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                        >
                                            <option value="">-- Select Department --</option>
                                            {masterData.departments.map(dept => (
                                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Designation <span className="text-red-500">*</span></label>
                                        <select 
                                            name="designationId" 
                                            value={formData.designationId} 
                                            onChange={handleInputChange} 
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                        >
                                            <option value="">-- Select Designation --</option>
                                            {masterData.designations.map(desig => (
                                                <option key={desig.id} value={desig.id}>{desig.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Grade</label>
                                        <select 
                                            name="gradeId" 
                                            value={formData.gradeId} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                        >
                                            <option value="">-- Select Grade --</option>
                                            {masterData.grades && masterData.grades.map(grade => (
                                                <option key={grade.id} value={grade.id}>{grade.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Type <span className="text-red-500">*</span></label>
                                        <select 
                                            name="employmentTypeId" 
                                            value={formData.employmentTypeId} 
                                            onChange={handleInputChange} 
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                        >
                                            <option value="">-- Select Type --</option>
                                            {masterData.employmentTypes.map(type => (
                                                <option key={type.id} value={type.id}>{type.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Employee Type <span className="text-red-500">*</span></label>
                                        <select 
                                            name="employeeType" 
                                            value={formData.employeeType} 
                                            onChange={handleInputChange} 
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                        >
                                            <option value="Permanent">Permanent</option>
                                            <option value="Contract">Contract</option>
                                            <option value="Temporary">Temporary</option>
                                            <option value="Intern">Intern</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Joining <span className="text-red-500">*</span></label>
                                        <input 
                                            type="date" 
                                            name="dateOfJoining" 
                                            value={formData.dateOfJoining} 
                                            onChange={handleInputChange} 
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Confirmation Date</label>
                                        <input 
                                            type="date" 
                                            name="confirmationDate" 
                                            value={formData.confirmationDate} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Probation Period (months)</label>
                                        <input 
                                            type="number" 
                                            name="probationPeriod" 
                                            value={formData.probationPeriod} 
                                            onChange={handleInputChange} 
                                            min="0"
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Retirement (Auto)</label>
                                        <input 
                                            type="date" 
                                            value={retirementDate} 
                                            disabled
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-600 font-medium"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Reporting Manager</label>
                                        <select 
                                            name="reportingManagerId" 
                                            value={formData.reportingManagerId || ''} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                        >
                                            <option value="">-- Select Manager --</option>
                                            {(() => {
                                                if (masterData && masterData.managers && Array.isArray(masterData.managers) && masterData.managers.length > 0) {
                                                    const filteredManagers = masterData.managers.filter(mgr => !employee || mgr.id !== employee.id);
                                                    return filteredManagers.map(mgr => {
                                                        const displayName = mgr.fullName || `${mgr.firstName || ''} ${mgr.lastName || ''}`.trim();
                                                        const displayCode = mgr.employeeCode || 'N/A';
                                                        return (
                                                            <option key={mgr.id} value={mgr.id}>
                                                                {displayName} ({displayCode})
                                                            </option>
                                                        );
                                                    });
                                                } else {
                                                    return <option value="" disabled>No employees available</option>;
                                                }
                                            })()}
                                        </select>
                                        {(!masterData.managers || masterData.managers.length === 0) && (
                                            <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                                                ⚠️ Add at least one employee first to assign reporting managers
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Work Location</label>
                                        <input 
                                            type="text" 
                                            name="workLocation" 
                                            value={formData.workLocation} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Status <span className="text-red-500">*</span></label>
                                        <select 
                                            name="employmentStatus" 
                                            value={formData.employmentStatus} 
                                            onChange={handleInputChange} 
                                            required
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Resigned">Resigned</option>
                                            <option value="Terminated">Terminated</option>
                                            <option value="On Leave">On Leave</option>
                                            <option value="Retired">Retired</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Reference Person Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                                        <span className="text-2xl">👤</span>
                                        <h3 className="text-lg font-bold text-slate-800">Reference Person</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Reference Person Name</label>
                                            <input 
                                                type="text" 
                                                name="referencePersonName" 
                                                value={formData.referencePersonName} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Reference Person Contact</label>
                                            <input 
                                                type="tel" 
                                                name="referencePersonContact" 
                                                value={formData.referencePersonContact} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: Shift & Attendance */}
                        {activeTab === 3 && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Shift Type</label>
                                        <select 
                                            name="shiftTypeId" 
                                            value={formData.shiftTypeId} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                        >
                                            <option value="">-- Select Shift --</option>
                                            {masterData.shiftTypes.map(shift => (
                                                <option key={shift.id} value={shift.id}>{shift.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Policy</label>
                                        <select 
                                            name="leavePolicyId" 
                                            value={formData.leavePolicyId} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                        >
                                            <option value="">-- Select Policy --</option>
                                            {masterData.leavePolicies.map(policy => (
                                                <option key={policy.id} value={policy.id}>{policy.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Weekly Off</label>
                                        <select 
                                            name="weeklyOff" 
                                            value={formData.weeklyOff} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                        >
                                            <option value="Sunday">Sunday</option>
                                            <option value="Monday">Monday</option>
                                            <option value="Tuesday">Tuesday</option>
                                            <option value="Wednesday">Wednesday</option>
                                            <option value="Thursday">Thursday</option>
                                            <option value="Friday">Friday</option>
                                            <option value="Saturday">Saturday</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 grid grid-cols-2 gap-4">
                                        <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                id="isOvertimeApplicable" 
                                                name="isOvertimeApplicable" 
                                                checked={formData.isOvertimeApplicable} 
                                                onChange={handleInputChange}
                                                className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Is Overtime Applicable</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                id="isLeaveApplicable" 
                                                name="isLeaveApplicable" 
                                                checked={formData.isLeaveApplicable} 
                                                onChange={handleInputChange}
                                                className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700">Is Leave Applicable</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Biometric Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                                        <span className="text-2xl">🔐</span>
                                        <h3 className="text-lg font-bold text-slate-800">Biometric Information</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Biometric Device</label>
                                            <select 
                                                name="biometricDeviceId" 
                                                value={formData.biometricDeviceId} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                            >
                                                <option value="">-- Select Device --</option>
                                                {masterData.biometricDevices.map(device => (
                                                    <option key={device.id} value={device.id}>{device.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Biometric Enrollment ID</label>
                                            <input 
                                                type="text" 
                                                name="biometricEnrollmentId" 
                                                value={formData.biometricEnrollmentId} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: Salary & Bank */}
                        {activeTab === 4 && (
                            <div className="space-y-8">
                                {/* Salary Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                                        <span className="text-2xl">💼</span>
                                        <h3 className="text-lg font-bold text-slate-800">Salary Information</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Basic Salary</label>
                                            <input 
                                                type="number" 
                                                name="basicSalary" 
                                                value={formData.basicSalary} 
                                                onChange={handleInputChange} 
                                                min="0" 
                                                step="0.01"
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Bank Details Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                                        <span className="text-2xl">🏦</span>
                                        <h3 className="text-lg font-bold text-slate-800">Bank Details</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Name</label>
                                            <input 
                                                type="text" 
                                                name="bankName" 
                                                value={formData.bankName} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Account Number</label>
                                            <input 
                                                type="text" 
                                                name="bankAccountNumber" 
                                                value={formData.bankAccountNumber} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">IFSC Code</label>
                                            <input 
                                                type="text" 
                                                name="ifscCode" 
                                                value={formData.ifscCode} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Branch</label>
                                            <input 
                                                type="text" 
                                                name="bankBranch" 
                                                value={formData.bankBranch} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Mode</label>
                                            <select 
                                                name="paymentMode" 
                                                value={formData.paymentMode} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                            >
                                                <option value="Bank Transfer">Bank Transfer</option>
                                                <option value="Cash">Cash</option>
                                                <option value="Cheque">Cheque</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Statutory Section */}
                                <div>
                                    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                                        <span className="text-2xl">📋</span>
                                        <h3 className="text-lg font-bold text-slate-800">Statutory Information</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">PAN Number</label>
                                            <input 
                                                type="text" 
                                                name="panNumber" 
                                                value={formData.panNumber} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">UAN Number</label>
                                            <input 
                                                type="text" 
                                                name="uanNumber" 
                                                value={formData.uanNumber} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">ESI Number</label>
                                            <input 
                                                type="text" 
                                                name="esiNumber" 
                                                value={formData.esiNumber} 
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: Transport */}
                        {activeTab === 5 && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-2 gap-6">
                                    <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            id="isTransportRequired" 
                                            name="isTransportRequired" 
                                            checked={formData.isTransportRequired} 
                                            onChange={handleInputChange}
                                            className="w-5 h-5 text-blue-600 rounded cursor-pointer focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Is Transport Required</span>
                                    </label>
                                </div>
                                
                                {formData.isTransportRequired && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                                            <span className="text-2xl">🚌</span>
                                            <h3 className="text-lg font-bold text-slate-800">Transport Details</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Bus</label>
                                                <select 
                                                    name="busId" 
                                                    value={formData.busId} 
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all"
                                                >
                                                    <option value="">-- Select Bus --</option>
                                                    {masterData.buses && masterData.buses.map(bus => (
                                                        <option key={bus.id} value={bus.id}>{bus.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">Pickup Point</label>
                                                <input 
                                                    type="text" 
                                                    name="pickupPoint" 
                                                    value={formData.pickupPoint} 
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 6: Documents */}
                        {activeTab === 6 && (
                            <div>
                                <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-blue-200">
                                    <span className="text-2xl">📄</span>
                                    <h3 className="text-lg font-bold text-slate-800">Document Information</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Aadhaar Number</label>
                                        <input 
                                            type="text" 
                                            name="aadhaarNumber" 
                                            value={formData.aadhaarNumber} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Passport Number</label>
                                        <input 
                                            type="text" 
                                            name="passportNumber" 
                                            value={formData.passportNumber} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Driving License Number</label>
                                        <input 
                                            type="text" 
                                            name="drivingLicenseNumber" 
                                            value={formData.drivingLicenseNumber} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Voter ID Number</label>
                                        <input 
                                            type="text" 
                                            name="voterIdNumber" 
                                            value={formData.voterIdNumber} 
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Modal Footer with Navigation */}
                    <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-8 py-5 border-t-2 border-slate-200 flex items-center justify-between">
                        <div className="flex gap-3">
                            {activeTab > 0 && (
                                <button 
                                    type="button" 
                                    onClick={handlePreviousTab} 
                                    className="px-6 py-2.5 border-2 border-slate-400 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-all flex items-center gap-2"
                                >
                                    <span>←</span> Previous
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="px-6 py-2.5 border-2 border-slate-400 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-all"
                            >
                                Cancel
                            </button>
                            
                            {activeTab < tabs.length - 1 ? (
                                <button 
                                    type="button" 
                                    onClick={handleNextTab} 
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    Next <span>→</span>
                                </button>
                            ) : (
                                <button 
                                    type="submit" 
                                    className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                                >
                                    <span>✓</span> {employee ? 'Update Employee' : 'Save Employee'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmployeeFormModal;