import React, { useState, useEffect } from 'react';
import { format, subDays, isValid } from 'date-fns';
import axios from 'axios';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Check, FileText, RotateCw } from 'lucide-react';

const AttendanceManagement = ({ companyId }) => {
    const [attendance, setAttendance] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Filter states
    const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '');
    const [startDate, setStartDate] = useState(subDays(new Date(), 7));
    const [endDate, setEndDate] = useState(new Date());
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    
    // Dialog states
    const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
    const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedAttendance, setSelectedAttendance] = useState(null);
    
    // Summary state
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        if (selectedCompanyId) {
            fetchAttendance();
            fetchEmployees();
            fetchDepartments();
        }
    }, [selectedCompanyId, startDate, endDate, selectedEmployee, selectedDepartment, selectedStatus, page]);

    const fetchCompanies = async () => {
        try {
            const response = await axios.get('/api/companies');
            setCompanies(response.data);
            if (!selectedCompanyId && response.data.length > 0) {
                setSelectedCompanyId(response.data[0].id);
            }
        } catch (err) {
            console.error('Error fetching companies:', err);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await axios.get('/api/departments', {
                params: { companyId: selectedCompanyId }
            });
            setDepartments(response.data);
        } catch (err) {
            console.error('Error fetching departments:', err);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        setError('');
        
        if (!startDate || !isValid(startDate)) {
            setError('Please select a valid start date');
            setLoading(false);
            return;
        }
        
        if (!endDate || !isValid(endDate)) {
            setError('Please select a valid end date');
            setLoading(false);
            return;
        }
        
        try {
            const params = {
                companyId: selectedCompanyId,
                startDate: format(new Date(startDate), 'yyyy-MM-dd'),
                endDate: format(new Date(endDate), 'yyyy-MM-dd'),
                page,
                limit: 50
            };
            
            if (selectedEmployee) params.employeeId = selectedEmployee;
            if (selectedStatus) params.status = selectedStatus;

            const response = await axios.get('/api/attendance', { params });
            
            if (response.data.success) {
                setAttendance(response.data.data);
                setTotalPages(response.data.pagination.pages);
                setTotalRecords(response.data.pagination.total);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            setError(errorMsg);
            console.error('❌ Error:', err.response?.data);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await axios.get('/api/employees', {
                params: { companyId: selectedCompanyId }
            });
            setEmployees(response.data);
        } catch (err) {
            console.error('Error fetching employees:', err);
        }
    };

    const handleGenerateAttendance = async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            const payload = {
                companyId: selectedCompanyId,
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd'),
            };
            
            if (selectedEmployee) {
                payload.employeeIds = [selectedEmployee];
            }

            const response = await axios.post('/api/attendance/generate', payload);
            
            if (response.data.success) {
                const { processed, created, updated, errors } = response.data.results;
                setSuccess(
                    `Attendance generated successfully! Processed: ${processed}, Created: ${created}, Updated: ${updated}` +
                    (errors.length > 0 ? `, Errors: ${errors.length}` : '')
                );
                
                if (errors.length > 0) {
                    console.warn('Generation errors:', errors);
                }
                
                setGenerateDialogOpen(false);
                fetchAttendance();
            } else {
                setError(response.data.message || 'Failed to generate attendance');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to generate attendance';
            setError(errorMsg);
            console.error('Error generating attendance:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        setLoading(true);
        setError('');
        
        try {
            const params = {
                companyId: selectedCompanyId,
                startDate: format(startDate, 'yyyy-MM-dd'),
                endDate: format(endDate, 'yyyy-MM-dd'),
            };
            
            if (selectedEmployee) params.employeeId = selectedEmployee;

            const response = await axios.get('/api/attendance/summary', { params });
            
            if (response.data.success) {
                setSummary(response.data.data);
            } else {
                setSummary(response.data);
            }
            setSummaryDialogOpen(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch summary');
            console.error('Error fetching summary:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAttendance = async () => {
        setLoading(true);
        setError('');
        
        try {
            await axios.put(`/api/attendance/${selectedAttendance.id}`, selectedAttendance);
            setSuccess('Attendance updated successfully');
            setEditDialogOpen(false);
            fetchAttendance();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update attendance');
            console.error('Error updating attendance:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAttendance = async (id) => {
        if (!window.confirm('Are you sure you want to delete this attendance record?')) {
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const response = await axios.delete(`/api/attendance/${id}`);
            setSuccess(response.data.message || 'Attendance deleted successfully');
            fetchAttendance();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete attendance');
            console.error('Error deleting attendance:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveAttendance = async (id) => {
        setLoading(true);
        setError('');
        
        try {
            const response = await axios.patch(`/api/attendance/${id}/approve`, {
                userId: 1
            });
            setSuccess(response.data.message || 'Attendance approved successfully');
            fetchAttendance();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to approve attendance');
            console.error('Error approving attendance:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            'Present': 'bg-green-100 text-green-800',
            'Absent': 'bg-red-100 text-red-800',
            'Half Day': 'bg-yellow-100 text-yellow-800',
            'Late': 'bg-orange-100 text-orange-800',
            'Leave': 'bg-blue-100 text-blue-800',
            'Holiday': 'bg-purple-100 text-purple-800',
            'Week Off': 'bg-gray-100 text-gray-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const formatTime = (datetime) => {
        if (!datetime) return '-';
        return format(new Date(datetime), 'hh:mm a');
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return format(new Date(date), 'dd MMM yyyy');
    };

    const filteredEmployees = selectedDepartment
        ? employees.filter(emp => emp.departmentId === selectedDepartment)
        : employees;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <div className="min-h-screen bg-gray-50 p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900">Attendance Management</h1>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setGenerateDialogOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            <FileText size={20} />
                            Generate Attendance
                        </button>
                        <button
                            onClick={fetchSummary}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                        >
                            <FileText size={20} />
                            View Summary
                        </button>
                        <button
                            onClick={fetchAttendance}
                            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                        >
                            <RotateCw size={20} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                        <span className="text-red-800">{error}</span>
                        <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">✕</button>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
                        <span className="text-green-800">{success}</span>
                        <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">✕</button>
                    </div>
                )}

                {/* Filters Card */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                            <select
                                value={selectedCompanyId}
                                onChange={(e) => {
                                    setSelectedCompanyId(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {companies.map((comp) => (
                                    <option key={comp.id} value={comp.id}>{comp.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                            <select
                                value={selectedDepartment}
                                onChange={(e) => {
                                    setSelectedDepartment(e.target.value);
                                    setSelectedEmployee('');
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => {
                                    setSelectedEmployee(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Employees</option>
                                {filteredEmployees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Statuses</option>
                                <option value="Present">Present</option>
                                <option value="Absent">Absent</option>
                                <option value="Half Day">Half Day</option>
                                <option value="Late">Late</option>
                                <option value="Leave">Leave</option>
                                <option value="Holiday">Holiday</option>
                                <option value="Week Off">Week Off</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                            <DatePicker
                                value={startDate}
                                onChange={(newValue) => {
                                    if (newValue && isValid(newValue)) {
                                        setStartDate(newValue);
                                        setPage(1);
                                    } else if (newValue === null) {
                                        setStartDate(subDays(new Date(), 7));
                                    }
                                }}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: "small",
                                        className: "w-full"
                                    }
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                            <DatePicker
                                value={endDate}
                                onChange={(newValue) => {
                                    if (newValue && isValid(newValue)) {
                                        setEndDate(newValue);
                                        setPage(1);
                                    } else if (newValue === null) {
                                        setEndDate(new Date());
                                    }
                                }}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: "small",
                                        className: "w-full"
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Pagination Info */}
                {totalRecords > 0 && (
                    <div className="mb-4 flex justify-between items-center bg-white rounded-lg p-4">
                        <span className="text-gray-600">
                            Showing {((page - 1) * 50) + 1} - {Math.min(page * 50, totalRecords)} of {totalRecords} records
                        </span>
                        <div className="flex gap-2 items-center">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-gray-700 font-medium">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(page + 1)}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                            <p className="mt-4 text-gray-600">Loading attendance records...</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Shift</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Check In</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Check Out</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Hours</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Late/Early</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Overtime</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {attendance.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="px-6 py-12 text-center">
                                                <p className="text-gray-500">No attendance records found</p>
                                                <p className="text-sm text-gray-400 mt-2">Click Generate Attendance to create records from biometric punches</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        attendance.map((record) => (
                                            <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-900">{formatDate(record.attendanceDate)}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    {record.employee ? (
                                                        <div>
                                                            <p className="font-medium text-gray-900">{record.employee.firstName} {record.employee.lastName}</p>
                                                            <p className="text-xs text-gray-500">{record.employee.employeeCode}</p>
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{record.employee?.department?.name || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{record.shiftType ? record.shiftType.name : '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{formatTime(record.firstCheckIn)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{formatTime(record.lastCheckOut)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{record.workingHours || 0} hrs</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="flex flex-col gap-2">
                                                        {record.isLate && (
                                                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                                                Late: {record.lateByMinutes}m
                                                            </span>
                                                        )}
                                                        {record.isEarlyExit && (
                                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                                                Early: {record.earlyExitMinutes}m
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">{record.overtimeHours > 0 ? `${record.overtimeHours} hrs` : '-'}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="flex gap-2 justify-center">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedAttendance(record);
                                                                setEditDialogOpen(true);
                                                            }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApproveAttendance(record.id)}
                                                            disabled={!!record.approvedAt}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Approve"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteAttendance(record.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Generate Dialog */}
                {generateDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg max-w-sm w-full mx-4 shadow-xl">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Generate Attendance</h3>
                            </div>
                            <div className="px-6 py-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-blue-900 font-medium mb-2">Current Selection:</p>
                                    <p className="text-sm text-blue-800">
                                        Date Range: {format(startDate, 'dd MMM yyyy')} to {format(endDate, 'dd MMM yyyy')}<br />
                                        {selectedEmployee ? (
                                            <>Employee: {filteredEmployees.find(e => e.id === selectedEmployee)?.firstName} {filteredEmployees.find(e => e.id === selectedEmployee)?.lastName}</>
                                        ) : (
                                            <>All Employees</>
                                        )}
                                    </p>
                                </div>
                                <p className="text-gray-700 mb-2">This will generate attendance records from biometric punches for the selected date range.</p>
                                <p className="text-sm text-gray-500">Existing records will be updated and new records will be created.</p>
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                                <button
                                    onClick={() => setGenerateDialogOpen(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateAttendance}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Now'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Dialog */}
                {summaryDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg max-w-sm w-full mx-4 shadow-xl">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Attendance Summary</h3>
                            </div>
                            <div className="px-6 py-4">
                                {summary && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500">Total Days</p>
                                            <p className="text-2xl font-bold text-gray-900">{summary.totalDays}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Present</p>
                                            <p className="text-2xl font-bold text-green-600">{summary.present}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Absent</p>
                                            <p className="text-2xl font-bold text-red-600">{summary.absent}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Half Day</p>
                                            <p className="text-2xl font-bold text-yellow-600">{summary.halfDay}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Late</p>
                                            <p className="text-2xl font-bold text-orange-600">{summary.late}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Early Exit</p>
                                            <p className="text-2xl font-bold text-purple-600">{summary.earlyExit}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Holiday</p>
                                            <p className="text-2xl font-bold text-blue-600">{summary.holiday}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Week Off</p>
                                            <p className="text-2xl font-bold text-indigo-600">{summary.weekOff}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500">Total Working Hours</p>
                                            <p className="text-2xl font-bold text-gray-900">{summary.totalWorkingHours} hrs</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500">Total Overtime</p>
                                            <p className="text-2xl font-bold text-gray-900">{summary.totalOvertimeHours} hrs</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                                <button
                                    onClick={() => setSummaryDialogOpen(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Dialog */}
                {editDialogOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg max-w-sm w-full mx-4 shadow-xl">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Attendance</h3>
                            </div>
                            <div className="px-6 py-4">
                                {selectedAttendance && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                            <select
                                                value={selectedAttendance.status}
                                                onChange={(e) =>
                                                    setSelectedAttendance({
                                                        ...selectedAttendance,
                                                        status: e.target.value
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="Present">Present</option>
                                                <option value="Absent">Absent</option>
                                                <option value="Half Day">Half Day</option>
                                                <option value="Late">Late</option>
                                                <option value="Leave">Leave</option>
                                                <option value="Holiday">Holiday</option>
                                                <option value="Week Off">Week Off</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Working Hours</label>
                                            <input
                                                type="number"
                                                value={selectedAttendance.workingHours || 0}
                                                onChange={(e) =>
                                                    setSelectedAttendance({
                                                        ...selectedAttendance,
                                                        workingHours: parseFloat(e.target.value)
                                                    })
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                                            <textarea
                                                value={selectedAttendance.remarks || ''}
                                                onChange={(e) =>
                                                    setSelectedAttendance({
                                                        ...selectedAttendance,
                                                        remarks: e.target.value
                                                    })
                                                }
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                                <button
                                    onClick={() => setEditDialogOpen(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateAttendance}
                                    disabled={loading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Updating...
                                        </>
                                    ) : (
                                        'Update'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </LocalizationProvider>
    );
};

export default AttendanceManagement;