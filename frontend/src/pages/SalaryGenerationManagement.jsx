import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SalaryGenerationManagement = ({ companyId: propCompanyId }) => {
    const [salaries, setSalaries] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Filter states
    const [filterCompany, setFilterCompany] = useState(propCompanyId || '');
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterStatus, setFilterStatus] = useState('');
    const [tabValue, setTabValue] = useState(0);
    
    // Dialog states
    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedSalary, setSelectedSalary] = useState(null);
    const [salaryDetails, setSalaryDetails] = useState(null);
    
    // Generate form states
    const [generateForm, setGenerateForm] = useState({
        companyId: propCompanyId || '',
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        departmentId: '',
        employeeIds: [],
    });
    
    // Payment form states
    const [paymentForm, setPaymentForm] = useState({
        paymentMethod: 'Bank Transfer',
        paymentReference: '',
    });

    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' },
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        fetchCompanies();
        if (propCompanyId) {
            setFilterCompany(propCompanyId);
            setGenerateForm(prev => ({ ...prev, companyId: propCompanyId }));
        }
    }, [propCompanyId]);

    useEffect(() => {
        if (filterCompany) {
            fetchSalaries();
            fetchDepartments(filterCompany);
            fetchEmployees(filterCompany);
        }
    }, [filterCompany, filterMonth, filterYear, filterStatus]);

    // Auto-filter employees by department in generate form
    useEffect(() => {
        if (generateForm.companyId && employees.length > 0 && generateForm.departmentId) {
            const deptId = parseInt(generateForm.departmentId);
            if (!isNaN(deptId)) {
                const deptEmployees = employees.filter(emp => emp.departmentId === deptId);
                setGenerateForm(prev => ({
                    ...prev,
                    employeeIds: deptEmployees.map(emp => emp.id)
                }));
            }
        } else if (generateForm.companyId && employees.length > 0) {
            setGenerateForm(prev => ({
                ...prev,
                employeeIds: []
            }));
        }
    }, [generateForm.departmentId, generateForm.companyId, employees]);

    const fetchSalaries = async () => {
        if (!filterCompany) return; // Prevent fetch if no company selected
        setLoading(true);
        setError('');
        try {
            const params = {
                companyId: filterCompany,
                month: filterMonth,
                year: filterYear,
            };
            if (filterStatus) params.status = filterStatus;
            console.log('Fetching salaries with params:', params);
            const response = await axios.get('http://localhost:5000/api/salary-generation', { params });
            setSalaries(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch salary records');
            console.error('Error fetching salaries:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/companies');
            setCompanies(response.data);
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    };

    const fetchDepartments = async (compId) => {
        if (!compId) {
            setDepartments([]);
            return;
        }
        try {
            const response = await axios.get('http://localhost:5000/api/departments', {
                params: { companyId: compId }
            });
            setDepartments(response.data);
        } catch (err) {
            console.error('Error fetching departments:', err);
        }
    };

    const fetchEmployees = async (compId) => {
        if (!compId) {
            setEmployees([]);
            return;
        }
        try {
            const response = await axios.get('http://localhost:5000/api/employees', {
                params: { companyId: compId }
            });
            setEmployees(response.data);
        } catch (err) {
            console.error('Error fetching employees:', err);
        }
    };

    const handleGenerateSalary = async () => {
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Enhanced validation
            if (!generateForm.companyId || generateForm.companyId === '') {
                setError('Company is required');
                setLoading(false);
                return;
            }
            if (!generateForm.month || isNaN(parseInt(generateForm.month)) || parseInt(generateForm.month) < 1 || parseInt(generateForm.month) > 12) {
                setError('Valid month is required');
                setLoading(false);
                return;
            }
            if (!generateForm.year || isNaN(parseInt(generateForm.year))) {
                setError('Valid year is required');
                setLoading(false);
                return;
            }

            // Ensure numeric values
            const payload = {
                companyId: generateForm.companyId,
                month: parseInt(generateForm.month),
                year: parseInt(generateForm.year),
                employeeIds: generateForm.employeeIds.map(id => parseInt(id)).filter(id => !isNaN(id)),
                generatedBy: 1
            };

            // Log payload for debugging
            console.log('Generating salary with payload:', payload,generateForm);

            const response = await axios.post('http://localhost:5000/api/salary-generation/generate', payload);
            console.log(response.data);            
            const { results } = response.data;
            if (results.generated > 0) {
                setSuccess(
                    `Salary generation completed! Processed: ${results.processed}, Generated: ${results.generated}, Skipped: ${results.skipped}`
                );
            } else if (results.skipped > 0) {
                setError(
                    `No new salaries generated. ${results.skipped} employees already have salary records for the selected period. Delete existing records to regenerate.`
                );
            } else {
                setError('No salaries generated. Check if employees have active salary structures.');
            }

            if (results.errors && results.errors.length > 0) {
                // Display errors in UI if any
                const errorMsg = results.errors.map(e => `Employee ${e.employeeId}: ${e.error}`).join('; ');
                setError(prev => prev ? `${prev}; ${errorMsg}` : `Generation issues: ${errorMsg}`);
                console.warn('Generation errors:', results.errors);
            }

            setGenerateDialogOpen(false);
            // Force refresh with current filters to show any new/updated
            await fetchSalaries();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate salary');
            console.error('Error generating salary:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (salary) => {
        setLoading(true);
        setError('');

        try {
            const response = await axios.get(`http://localhost:5000/api/salary-generation/${salary.id}`);
            setSalaryDetails(response.data);
            setDetailsDialogOpen(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch salary details');
            console.error('Error fetching details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveSalary = async (salaryId) => {
        if (!window.confirm('Are you sure you want to approve this salary?')) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            await axios.patch(`http://localhost:5000/api/salary-generation/${salaryId}/approve`, {
                approvedBy: 1
            });
            setSuccess('Salary approved successfully');
            fetchSalaries();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve salary');
            console.error('Error approving salary:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPaymentDialog = (salary) => {
        setSelectedSalary(salary);
        setPaymentForm({
            paymentMethod: 'Bank Transfer',
            paymentReference: '',
        });
        setPaymentDialogOpen(true);
    };

    const handlePaySalary = async () => {
        setLoading(true);
        setError('');

        try {
            await axios.patch(`http://localhost:5000/api/salary-generation/${selectedSalary.id}/pay`, {
                ...paymentForm,
                paidBy: 1
            });
            setSuccess('Salary marked as paid successfully');
            setPaymentDialogOpen(false);
            fetchSalaries();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark salary as paid');
            console.error('Error paying salary:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSalary = async (salaryId) => {
        if (!window.confirm('Are you sure you want to delete this salary record?')) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            await axios.delete(`http://localhost:5000/api/salary-generation/${salaryId}`);
            setSuccess('Salary record deleted successfully');
            fetchSalaries();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete salary');
            console.error('Error deleting salary:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        const badgeClasses = {
            'Draft': 'bg-gray-100 text-gray-800 border border-gray-300',
            'Generated': 'bg-blue-100 text-blue-800 border border-blue-300',
            'Approved': 'bg-amber-100 text-amber-800 border border-amber-300',
            'Paid': 'bg-green-100 text-green-800 border border-green-300',
            'Cancelled': 'bg-red-100 text-red-800 border border-red-300',
        };
        return badgeClasses[status] || 'bg-gray-100 text-gray-800 border border-gray-300';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(amount || 0);
    };

    const getSalariesByStatus = (status) => {
        if (!status) return salaries;
        return salaries.filter(s => s.status === status);
    };

    const calculateTotals = (salaryList) => {
        return {
            count: salaryList.length,
            totalGross: salaryList.reduce((sum, s) => sum + parseFloat(s.grossSalary || 0), 0),
            totalNet: salaryList.reduce((sum, s) => sum + parseFloat(s.netSalary || 0), 0),
            totalDeductions: salaryList.reduce((sum, s) => sum + parseFloat(s.totalDeductions || 0), 0),
        };
    };

    const renderSalaryTable = (salaryList) => {
        if (salaryList.length === 0) {
            return (
                <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                        No salary records found for the selected filters. Try generating new ones or adjusting filters.
                    </td>
                </tr>
            );
        }

        return salaryList.map((salary, idx) => (
            <tr key={salary.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="font-medium">{salary.employee?.firstName} {salary.employee?.lastName}</div>
                    <div className="text-xs text-gray-600">{salary.employee?.employeeCode}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">
                    {months.find(m => m.value === salary.salaryMonth)?.label} {salary.salaryYear}
                </td>
                <td className="px-6 py-4 text-sm text-right text-gray-700">{salary.presentDays}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-700">{salary.absentDays}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-700">{salary.overtimeHours}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-700">{formatCurrency(salary.grossSalary)}</td>
                <td className="px-6 py-4 text-sm text-right text-gray-700">{formatCurrency(salary.totalDeductions)}</td>
                <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">{formatCurrency(salary.netSalary)}</td>
                <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(salary.status)}`}>
                        {salary.status}
                    </span>
                </td>
                <td className="px-6 py-4 text-center">
                    <div className="flex gap-1 justify-center">
                        <button
                            onClick={() => handleViewDetails(salary)}
                            className="p-1 text-gray-600 hover:text-blue-600 transition"
                            title="View Details"
                        >
                            👁️
                        </button>
                        {salary.status === 'Generated' && (
                            <button
                                onClick={() => handleApproveSalary(salary.id)}
                                className="p-1 text-gray-600 hover:text-green-600 transition"
                                title="Approve"
                            >
                                ✅
                            </button>
                        )}
                        {salary.status === 'Approved' && (
                            <button
                                onClick={() => handleOpenPaymentDialog(salary)}
                                className="p-1 text-gray-600 hover:text-blue-600 transition"
                                title="Mark as Paid"
                            >
                                💳
                            </button>
                        )}
                        {(salary.status === 'Draft' || salary.status === 'Generated') && (
                            <button
                                onClick={() => handleDeleteSalary(salary.id)}
                                className="p-1 text-gray-600 hover:text-red-600 transition"
                                title="Delete"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </td>
            </tr>
        ));
    };

    const tabs = [
        { label: `All (${salaries.length})`, value: 0 },
        { label: `Generated (${getSalariesByStatus('Generated').length})`, value: 1 },
        { label: `Approved (${getSalariesByStatus('Approved').length})`, value: 2 },
        { label: `Paid (${getSalariesByStatus('Paid').length})`, value: 3 },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">💰 Salary Generation</h1>
                <div className="flex gap-3">
                    <button
                        onClick={() => setGenerateDialogOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg transition duration-200 flex items-center gap-2"
                        disabled={companies.length === 0}
                    >
                        ➕ Generate Salary
                    </button>
                    <button
                        onClick={fetchSalaries}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition duration-200"
                        disabled={!filterCompany}
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 font-bold">✕</button>
                </div>
            )}

            {/* Success Alert */}
            {success && (
                <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded flex justify-between items-center">
                    <span>{success}</span>
                    <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900 font-bold">✕</button>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {!propCompanyId && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
                            <select
                                value={filterCompany}
                                onChange={(e) => {
                                    setFilterCompany(e.target.value);
                                    setGenerateForm(prev => ({ ...prev, companyId: e.target.value }));
                                    if (e.target.value) {
                                        fetchDepartments(e.target.value);
                                        fetchEmployees(e.target.value);
                                    }
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Company</option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>{company.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Month</label>
                        <select
                            value={filterMonth}
                            onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {months.map((month) => (
                                <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(parseInt(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {years.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="Draft">Draft</option>
                            <option value="Generated">Generated</option>
                            <option value="Approved">Approved</option>
                            <option value="Paid">Paid</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-gray-600 text-sm mb-2">Total Employees</div>
                    <div className="text-3xl font-bold text-gray-800">{salaries.length}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-gray-600 text-sm mb-2">Total Gross Salary</div>
                    <div className="text-2xl font-bold text-green-700">{formatCurrency(calculateTotals(salaries).totalGross)}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-gray-600 text-sm mb-2">Total Deductions</div>
                    <div className="text-2xl font-bold text-red-700">{formatCurrency(calculateTotals(salaries).totalDeductions)}</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="text-gray-600 text-sm mb-2">Total Net Salary</div>
                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(calculateTotals(salaries).totalNet)}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-t-lg shadow border-b border-gray-200 mb-0">
                <div className="flex border-b border-gray-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setTabValue(tab.value)}
                            className={`px-6 py-4 font-medium transition ${
                                tabValue === tab.value
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Salary Table */}
            {loading ? (
                <div className="flex justify-center items-center py-12 bg-white rounded-b-lg shadow">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-b-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Employee</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Month/Year</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold">Present</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold">Absent</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold">OT Hours</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold">Gross</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold">Deductions</th>
                                    <th className="px-6 py-3 text-right text-sm font-semibold">Net Salary</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                    <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {tabValue === 0 && renderSalaryTable(salaries)}
                                {tabValue === 1 && renderSalaryTable(getSalariesByStatus('Generated'))}
                                {tabValue === 2 && renderSalaryTable(getSalariesByStatus('Approved'))}
                                {tabValue === 3 && renderSalaryTable(getSalariesByStatus('Paid'))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Generate Salary Dialog */}
            {generateDialogOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
                            <h2 className="text-xl font-bold">Generate Salary</h2>
                        </div>
                        <div className="p-6 max-h-96 overflow-y-auto">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Company *</label>
                                    <select
                                        value={generateForm.companyId}
                                        onChange={(e) => {
                                            const newCompanyId = e.target.value;
                                            setGenerateForm(prev => ({
                                                ...prev,
                                                companyId: newCompanyId,
                                                departmentId: '',
                                                employeeIds: []
                                            }));
                                            if (newCompanyId) {
                                                fetchDepartments(newCompanyId);
                                                fetchEmployees(newCompanyId);
                                            }
                                        }}
                                        disabled={!!propCompanyId}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        <option value="">Select Company</option>
                                        {companies.map((company) => (
                                            <option key={company.id} value={company.id}>{company.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Month *</label>
                                        <select
                                            value={generateForm.month}
                                            onChange={(e) => setGenerateForm({ ...generateForm, month: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {months.map((month) => (
                                                <option key={month.value} value={month.value}>{month.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Year *</label>
                                        <select
                                            value={generateForm.year}
                                            onChange={(e) => setGenerateForm({ ...generateForm, year: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {years.map((year) => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Department (Optional)</label>
                                    <select
                                        value={generateForm.departmentId}
                                        onChange={(e) => setGenerateForm({ 
                                            ...generateForm, 
                                            departmentId: e.target.value,
                                            employeeIds: []  // Reset manual selection when dept changes
                                        })}
                                        disabled={!generateForm.companyId || departments.length === 0}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-600 mt-1">Selecting a department will auto-include all employees in it for generation</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Employees (Optional - Overrides Dept)</label>
                                    <select
                                        multiple
                                        value={generateForm.employeeIds.map(id => id.toString())}
                                        onChange={(e) => setGenerateForm({ 
                                            ...generateForm, 
                                            employeeIds: Array.from(e.target.selectedOptions, option => parseInt(option.value)).filter(id => !isNaN(id))
                                        })}
                                        disabled={!generateForm.companyId || employees.length === 0}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 h-32"
                                    >
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName} ({emp.employeeCode})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-600 mt-1">Leave empty to generate for all employees (or auto-filtered by department)</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => {
                                    setGenerateDialogOpen(false);
                                    // Reset form if needed
                                    setGenerateForm(prev => ({
                                        ...prev,
                                        departmentId: '',
                                        employeeIds: []
                                    }));
                                }}
                                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGenerateSalary}
                                disabled={loading || !generateForm.companyId || companies.length === 0}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                            >
                                {loading ? '⏳ Generating...' : 'Generate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Salary Details Dialog */}
            {detailsDialogOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 sticky top-0">
                            <h2 className="text-xl font-bold">
                                Salary Details - {salaryDetails?.employee?.firstName} {salaryDetails?.employee?.lastName}
                            </h2>
                        </div>
                        <div className="p-6">
                            {salaryDetails && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Employee Code</div>
                                            <div className="font-semibold text-gray-800">{salaryDetails.employee?.employeeCode}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Period</div>
                                            <div className="font-semibold text-gray-800">
                                                {months.find(m => m.value === salaryDetails.salaryMonth)?.label} {salaryDetails.salaryYear}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Working Days</div>
                                            <div className="font-semibold text-gray-800">{salaryDetails.workingDays}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Present Days</div>
                                            <div className="font-semibold text-gray-800">{salaryDetails.presentDays}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-600 mb-1">Absent Days</div>
                                            <div className="font-semibold text-gray-800">{salaryDetails.absentDays}</div>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 pt-4">
                                        <h3 className="font-semibold text-gray-800 mb-4">Salary Components</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-100 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-semibold">Component</th>
                                                        <th className="px-4 py-2 text-left font-semibold">Type</th>
                                                        <th className="px-4 py-2 text-right font-semibold">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {salaryDetails.details?.filter(d => d.componentType === 'Earning').map((detail) => (
                                                        <tr key={detail.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2">{detail.componentName}</td>
                                                            <td className="px-4 py-2">
                                                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">Earning</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right">{formatCurrency(detail.calculatedAmount)}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-gray-50 font-semibold">
                                                        <td colSpan={2} className="px-4 py-2">Total Earnings</td>
                                                        <td className="px-4 py-2 text-right">{formatCurrency(salaryDetails.totalEarnings)}</td>
                                                    </tr>
                                                    {salaryDetails.details?.filter(d => d.componentType === 'Deduction').map((detail) => (
                                                        <tr key={detail.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2">{detail.componentName}</td>
                                                            <td className="px-4 py-2">
                                                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">Deduction</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right">{formatCurrency(detail.calculatedAmount)}</td>
                                                        </tr>
                                                    ))}
                                                    {salaryDetails.absentDeduction > 0 && (
                                                        <tr className="hover:bg-gray-50">
                                                            <td className="px-4 py-2">Absent Deduction</td>
                                                            <td className="px-4 py-2">
                                                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">Deduction</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right">{formatCurrency(salaryDetails.absentDeduction)}</td>
                                                        </tr>
                                                    )}
                                                    {salaryDetails.lateDeduction > 0 && (
                                                        <tr className="hover:bg-gray-50">
                                                            <td className="px-4 py-2">Late Deduction</td>
                                                            <td className="px-4 py-2">
                                                                <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">Deduction</span>
                                                            </td>
                                                            <td className="px-4 py-2 text-right">{formatCurrency(salaryDetails.lateDeduction)}</td>
                                                        </tr>
                                                    )}
                                                    <tr className="bg-gray-50 font-semibold">
                                                        <td colSpan={2} className="px-4 py-2">Total Deductions</td>
                                                        <td className="px-4 py-2 text-right">{formatCurrency(salaryDetails.totalDeductions)}</td>
                                                    </tr>
                                                    <tr className="bg-blue-50 font-bold text-blue-600">
                                                        <td colSpan={2} className="px-4 py-3">Net Salary</td>
                                                        <td className="px-4 py-3 text-right">{formatCurrency(salaryDetails.netSalary)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setDetailsDialogOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                            >
                                Close
                            </button>
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                                ⬇️ Download Payslip
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Dialog */}
            {paymentDialogOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
                            <h2 className="text-xl font-bold">Mark Salary as Paid</h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method *</label>
                                <select
                                    value={paymentForm.paymentMethod}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cash">Cash</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Reference / Transaction ID</label>
                                <input
                                    type="text"
                                    value={paymentForm.paymentReference}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentReference: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setPaymentDialogOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePaySalary}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
                            >
                                {loading ? '⏳ Processing...' : 'Mark as Paid'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryGenerationManagement;