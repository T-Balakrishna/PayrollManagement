import React, { useState, useEffect } from 'react';
import EmployeeFormModal from './EmployeeFormModal';
import BulkUploadModal from './BulkUploadModal';

const apiRequest = async (url, options = {}) => {
    const token = localStorage.getItem('authToken');
    const defaultOptions = { 
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
        } 
    };
    const response = await fetch(url, { ...defaultOptions, ...options });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || `API Error: ${response.statusText}`);
    }
    return response.json();
};

const EmployeeManagement = () => {
    // State Management
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    
    // Master data for dropdowns
    const [masterData, setMasterData] = useState({
        departments: [],
        designations: [],
        employmentTypes: [],
        shiftTypes: [],
        leavePolicies: [],
        biometricDevices: [],
        buses: [],
        managers: [],
        grades: []
    });

    // Fetch companies on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const data = await apiRequest('/api/companies');
                setCompanies(data);
                if (data.length > 0) setSelectedCompanyId(data[0].id);
            } catch (err) { 
                setError(err.message); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchCompanies();
    }, []);

    // Fetch company-specific data
    useEffect(() => {
        if (!selectedCompanyId) return;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                const [
                    employeesData,
                    departmentsData,
                    designationsData,
                    employmentTypesData,
                    shiftTypesData,
                    leavePoliciesData,
                    biometricDevicesData,
                    busesData,
                    gradesData
                ] = await Promise.all([
                    apiRequest(`/api/employees?companyId=${selectedCompanyId}`),
                    apiRequest(`/api/departments?companyId=${selectedCompanyId}`),
                    apiRequest(`/api/designations?companyId=${selectedCompanyId}`),
                    apiRequest(`/api/employment-types?companyId=${selectedCompanyId}`),
                    apiRequest(`/api/shift-types?companyId=${selectedCompanyId}`),
                    apiRequest(`/api/leave-policies?companyId=${selectedCompanyId}`),
                    apiRequest(`/api/biometric-devices?companyId=${selectedCompanyId}`),
                    apiRequest(`/api/buses?companyId=${selectedCompanyId}`),
                    apiRequest(`/api/employer-grades?companyId=${selectedCompanyId}`)
                ]);
                
                setEmployees(employeesData);
                setMasterData({
                    departments: departmentsData,
                    designations: designationsData,
                    employmentTypes: employmentTypesData,
                    shiftTypes: shiftTypesData,
                    leavePolicies: leavePoliciesData,
                    biometricDevices: biometricDevicesData,
                    buses: busesData,
                    managers: employeesData,
                    grades: gradesData
                });
                
                console.log('Managers loaded:', employeesData.length, 'employees');
                console.log('Manager data sample:', employeesData[0]);
            } catch (err) { 
                setError(err.message);
                console.error('Error fetching data:', err);
            } finally { 
                setLoading(false); 
            }
        };
        
        fetchData();
    }, [selectedCompanyId]);

    // Event Handlers
    const handleCompanyChange = (e) => setSelectedCompanyId(e.target.value);
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const openAddModal = () => {
        setEditingEmployee(null);
        setIsModalOpen(true);
    };

    const openEditModal = async (employee) => {
        try {
            const fullEmployee = await apiRequest(`/api/employees/${employee.id}`);
            setEditingEmployee(fullEmployee);
            setIsModalOpen(true);
        } catch (err) {
            window.alert('Error loading employee: ' + err.message);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEmployee(null);
    };

    const handleEmployeeSaved = async () => {
        try {
            const data = await apiRequest(`/api/employees?companyId=${selectedCompanyId}`);
            setEmployees(data);
            closeModal();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this employee?')) return;
        
        try {
            await apiRequest(`/api/employees/${id}`, { method: 'DELETE' });
            setEmployees(employees.filter(e => e.id !== id));
        } catch (err) {
            window.alert('Error deleting employee: ' + err.message);
        }
    };

    const openBulkUploadModal = () => {
        setIsBulkUploadModalOpen(true);
    };

    const closeBulkUploadModal = () => {
        setIsBulkUploadModalOpen(false);
    };

    const handleBulkUploadComplete = async () => {
        try {
            const data = await apiRequest(`/api/employees?companyId=${selectedCompanyId}`);
            setEmployees(data);
        } catch (err) {
            setError(err.message);
        }
    };

    // Filter employees
    const filteredEmployees = employees.filter(e =>
        e.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.personalEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);

    if (loading && companies.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3">
                    <span className="text-4xl">👤</span>
                    Employee Management
                </h1>
                <p className="text-slate-600 mt-2">Manage and organize your company's workforce</p>
            </div>

            {/* Company Selector */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <label htmlFor="company-select" className="block text-sm font-semibold text-slate-700 mb-3">Select Company:</label>
                <select 
                    id="company-select" 
                    value={selectedCompanyId} 
                    onChange={handleCompanyChange}
                    className="w-full md:w-96 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-800 font-medium"
                >
                    {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                </select>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="font-semibold text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {/* Search and Action Buttons */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <input 
                        type="text" 
                        placeholder="Search employees by name, code, email..." 
                        value={searchTerm} 
                        onChange={handleSearchChange} 
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-3 text-slate-400">🔍</span>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={openBulkUploadModal}
                        className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white font-semibold rounded-lg hover:from-cyan-700 hover:to-cyan-800 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                    >
                        📤 Bulk Upload
                    </button>
                    <button 
                        onClick={openAddModal}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                    >
                        + Add Employee
                    </button>
                </div>
            </div>

            {/* Employees Table */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                <th className="px-6 py-3 text-left text-sm font-semibold">Emp Code</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Designation</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Mobile</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Join Date</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-8 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                            <span className="text-slate-600">Loading employees...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEmployees.length > 0 ? (
                                filteredEmployees.map((emp, index) => (
                                    <tr key={emp.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{emp.employeeCode}</td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{emp.fullName}</td>
                                        <td className="px-6 py-4 text-sm text-slate-700">{emp.department?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-700">{emp.designation?.name || 'N/A'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-700">{emp.mobileNumber}</td>
                                        <td className="px-6 py-4 text-sm text-slate-700">{new Date(emp.dateOfJoining).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                                emp.employmentStatus === 'Active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : emp.employmentStatus === 'Resigned'
                                                    ? 'bg-red-100 text-red-800'
                                                    : emp.employmentStatus === 'Terminated'
                                                    ? 'bg-red-100 text-red-800'
                                                    : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {emp.employmentStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                <button 
                                                    onClick={() => openEditModal(emp)}
                                                    title="Edit"
                                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    ✏️
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(emp.id)}
                                                    title="Delete"
                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-8 text-center">
                                        <div className="text-slate-500">
                                            <span className="text-4xl mb-2 block">👥</span>
                                            <p>No employees found.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Employee Form Modal */}
            {isModalOpen && (
                <EmployeeFormModal
                    employee={editingEmployee}
                    companyId={selectedCompanyId}
                    companyName={selectedCompany?.name}
                    masterData={masterData}
                    onClose={closeModal}
                    onSave={handleEmployeeSaved}
                />
            )}

            {/* Bulk Upload Modal */}
            {isBulkUploadModalOpen && (
                <BulkUploadModal
                    companyId={selectedCompanyId}
                    onClose={closeBulkUploadModal}
                    onUploadComplete={handleBulkUploadComplete}
                />
            )}
        </div>
    );
};

export default EmployeeManagement;