import React, { useState, useEffect } from 'react';

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

const BiometricAttendance = () => {
    // State Management
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [devices, setDevices] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    
    const [punches, setPunches] = useState([]);
    const [summary, setSummary] = useState({
        totalRecords: 0,
        todayPunches: 0,
        uniqueEmployees: 0,
        lastPunch: null
    });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        total: 0,
        pages: 0
    });

    const [filters, setFilters] = useState({
        deviceId: '',
        employeeId: '',
        date: '',
        fromDate: '',
        toDate: '',
        punchType: '',
        searchTerm: ''
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);

    const [autoSyncStatus, setAutoSyncStatus] = useState({
        isRunning: false,
        isSyncing: false,
        lastSyncTime: null,
        uptime: 'Not started'
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

    // Fetch auto-sync status periodically
    useEffect(() => {
        const fetchAutoSyncStatus = async () => {
            try {
                const response = await apiRequest('/api/biometric-punches/auto-sync/status');
                if (response.success) {
                    setAutoSyncStatus(response.data);
                }
            } catch (err) {
                console.error('Error fetching auto-sync status:', err);
            }
        };

        fetchAutoSyncStatus();
        const interval = setInterval(fetchAutoSyncStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    // Fetch devices and employees when company changes
    useEffect(() => {
        if (!selectedCompanyId) return;
        
        const fetchMasterData = async () => {
            try {
                const [devicesData, employeesData] = await Promise.all([
                    apiRequest(`/api/biometric-devices?companyId=${selectedCompanyId}`),
                    apiRequest(`/api/employees?companyId=${selectedCompanyId}`)
                ]);
                setDevices(devicesData);
                setEmployees(employeesData);
                if (devicesData.length > 0) setSelectedDeviceId(devicesData[0].id);
            } catch (err) {
                console.error('Error fetching master data:', err);
            }
        };
        fetchMasterData();
    }, [selectedCompanyId]);

    // Fetch punches
    useEffect(() => {
        if (!selectedCompanyId) return;
        fetchPunches();
    }, [selectedCompanyId, filters, pagination.page, pagination.limit]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh) return;
        
        const interval = setInterval(() => {
            fetchPunches(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [autoRefresh, selectedCompanyId, filters]);

    const fetchPunches = async (silent = false) => {
        if (!silent) setLoading(true);
        
        try {
            const queryParams = new URLSearchParams({
                companyId: selectedCompanyId,
                page: pagination.page,
                limit: pagination.limit
            });

            if (filters.deviceId) queryParams.append('deviceId', filters.deviceId);
            if (filters.employeeId) queryParams.append('employeeId', filters.employeeId);
            if (filters.date) queryParams.append('date', filters.date);
            if (filters.fromDate) queryParams.append('fromDate', filters.fromDate);
            if (filters.toDate) queryParams.append('toDate', filters.toDate);
            if (filters.punchType) queryParams.append('punchType', filters.punchType);

            const response = await apiRequest(`/api/biometric-punches?${queryParams.toString()}`);
            
            if (response.success) {
                setPunches(response.data);
                setSummary(response.summary);
                setPagination(prev => ({
                    ...prev,
                    total: response.pagination.total,
                    pages: response.pagination.pages
                }));
            }
        } catch (err) {
            if (!silent) setError(err.message);
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const handleSyncFromDevice = async () => {
        if (!selectedDeviceId) {
            alert('Please select a device first');
            return;
        }

        if (!confirm('This will fetch attendance from the selected device. Continue?')) {
            return;
        }

        setSyncing(true);
        setSyncMessage(null);

        try {
            const response = await apiRequest(
                `/api/biometric-punches/fetch-and-import/${selectedDeviceId}`,
                {
                    method: 'POST',
                    body: JSON.stringify({ companyId: selectedCompanyId })
                }
            );

            if (response.success) {
                setSyncMessage({
                    type: 'success',
                    text: `✅ ${response.message}`,
                    details: response.summary
                });

                setTimeout(() => {
                    fetchPunches();
                }, 1000);
            } else {
                setSyncMessage({
                    type: 'error',
                    text: `❌ ${response.message}`
                });
            }
        } catch (err) {
            setSyncMessage({
                type: 'error',
                text: `❌ Sync failed: ${err.message}`
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleTriggerAllDevicesSync = async () => {
        if (!confirm('This will sync all active devices immediately. Continue?')) {
            return;
        }

        setSyncing(true);
        setSyncMessage(null);

        try {
            const response = await apiRequest('/api/biometric-punches/auto-sync/trigger', {
                method: 'POST'
            });

            if (response.success) {
                setSyncMessage({
                    type: 'success',
                    text: `✅ All devices synced successfully!`,
                    details: null
                });

                setTimeout(() => {
                    fetchPunches();
                }, 2000);
            } else {
                setSyncMessage({
                    type: 'error',
                    text: `❌ ${response.message}`
                });
            }
        } catch (err) {
            setSyncMessage({
                type: 'error',
                text: `❌ Sync failed: ${err.message}`
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleClearFilters = () => {
        setFilters({
            deviceId: '',
            employeeId: '',
            date: '',
            fromDate: '',
            toDate: '',
            punchType: '',
            searchTerm: ''
        });
    };

    const handleExportCSV = () => {
        const headers = ['S.No', 'Employee ID', 'Employee Name', 'Device', 'Date', 'Time', 'Type', 'Status'];
        const rows = punches.map((punch, index) => [
            index + 1,
            punch.employee?.employeeCode || 'N/A',
            `${punch.employee?.firstName || ''} ${punch.employee?.lastName || ''}`.trim(),
            punch.device?.name || 'N/A',
            new Date(punch.punchDate).toLocaleDateString(),
            new Date(punch.punchTime).toLocaleTimeString(),
            punch.punchType,
            punch.isLate ? 'Late' : punch.isEarlyOut ? 'Early Out' : 'On Time'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `biometric_attendance_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const filteredPunches = punches.filter(punch => {
        if (!filters.searchTerm) return true;
        const searchLower = filters.searchTerm.toLowerCase();
        const employeeName = `${punch.employee?.firstName || ''} ${punch.employee?.lastName || ''}`.toLowerCase();
        const employeeCode = punch.employee?.employeeCode?.toLowerCase() || '';
        return employeeName.includes(searchLower) || employeeCode.includes(searchLower);
    });

    const formatTime = (dateTime) => {
        const date = new Date(dateTime);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDate = (dateTime) => {
        const date = new Date(dateTime);
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-slate-800">🕐 Biometric Attendance Records</h1>
                
                {/* Auto-Sync Status Indicator */}
                <div className={`px-6 py-3 rounded-lg border-2 flex items-center gap-3 ${
                    autoSyncStatus.isRunning 
                        ? 'bg-green-50 border-green-400' 
                        : 'bg-red-50 border-red-400'
                }`}>
                    <div className={`w-3 h-3 rounded-full ${
                        autoSyncStatus.isRunning ? 'bg-green-500' : 'bg-red-500'
                    } ${autoSyncStatus.isSyncing ? 'animate-pulse' : ''}`}></div>
                    <div>
                        <strong className={autoSyncStatus.isRunning ? 'text-green-700' : 'text-red-700'}>
                            Auto-Sync: {autoSyncStatus.isRunning ? 'Active' : 'Inactive'}
                        </strong>
                        <div className="text-xs text-gray-600">
                            {autoSyncStatus.isSyncing ? '🔄 Syncing now...' : 
                             autoSyncStatus.lastSyncTime ? `Last sync: ${new Date(autoSyncStatus.lastSyncTime).toLocaleTimeString()}` : 
                             'Waiting for first sync...'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Company & Device Selector */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Company</label>
                        <select 
                            value={selectedCompanyId} 
                            onChange={(e) => setSelectedCompanyId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Device</label>
                        <select 
                            value={selectedDeviceId} 
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {devices.map(device => (
                                <option key={device.id} value={device.id}>
                                    {device.name} - {device.location}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={handleSyncFromDevice} 
                        disabled={syncing || !selectedDeviceId}
                        className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors duration-200 ${
                            syncing || !selectedDeviceId
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                        }`}
                    >
                        {syncing ? '⏳ Syncing...' : '🔄 Sync Device'}
                    </button>

                    <button 
                        onClick={handleTriggerAllDevicesSync} 
                        disabled={syncing}
                        className={`px-4 py-2 rounded-lg font-semibold text-white transition-colors duration-200 ${
                            syncing
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                        }`}
                    >
                        {syncing ? '⏳ Syncing...' : '🔄 Sync All'}
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
                <strong className="text-blue-900 block mb-2">ℹ️ Auto-Sync Information</strong>
                <ul className="text-sm text-blue-800 space-y-1 ml-4">
                    <li>✅ All active devices are automatically synced every <strong>5 minutes</strong></li>
                    <li>🔄 Auto-sync runs in the background without manual intervention</li>
                    <li>📊 Status indicator shows real-time sync activity</li>
                    <li>⚡ You can manually trigger sync anytime using the buttons above</li>
                </ul>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
                    {error}
                </div>
            )}

            {/* Sync Message */}
            {syncMessage && (
                <div className={`rounded-lg p-4 mb-6 ${
                    syncMessage.type === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-800' 
                        : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                    <strong>{syncMessage.text}</strong>
                    {syncMessage.details && (
                        <div className="mt-3 text-sm space-y-1">
                            <div>📊 Total Records: {syncMessage.details.total}</div>
                            <div>✅ Imported: {syncMessage.details.imported}</div>
                            <div>🔁 Duplicates: {syncMessage.details.duplicates}</div>
                            <div>❓ Not Found: {syncMessage.details.notFound}</div>
                            {syncMessage.details.failed > 0 && (
                                <div>❌ Failed: {syncMessage.details.failed}</div>
                            )}
                        </div>
                    )}
                    <button 
                        onClick={() => setSyncMessage(null)}
                        className="mt-3 px-3 py-1 bg-white rounded hover:bg-gray-100 text-xs font-semibold"
                    >
                        Close
                    </button>
                </div>
            )}

            {/* Filters Panel */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
                
                {/* First Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Device</label>
                        <select 
                            value={filters.deviceId} 
                            onChange={(e) => handleFilterChange('deviceId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Devices</option>
                            {devices.map(device => (
                                <option key={device.id} value={device.id}>
                                    {device.name} - {device.location}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                        <select 
                            value={filters.employeeId} 
                            onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Employees</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.employeeCode} - {emp.firstName} {emp.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Punch Type</label>
                        <select 
                            value={filters.punchType} 
                            onChange={(e) => handleFilterChange('punchType', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Types</option>
                            <option value="IN">IN</option>
                            <option value="OUT">OUT</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                        <input 
                            type="text" 
                            placeholder="Employee name or ID..."
                            value={filters.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Second Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Single Date</label>
                        <input 
                            type="date" 
                            value={filters.date}
                            onChange={(e) => handleFilterChange('date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                        <input 
                            type="date" 
                            value={filters.fromDate}
                            onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                            disabled={filters.date !== ''}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                filters.date !== '' ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'border-gray-300'
                            }`}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                        <input 
                            type="date" 
                            value={filters.toDate}
                            onChange={(e) => handleFilterChange('toDate', e.target.value)}
                            disabled={filters.date !== ''}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                filters.date !== '' ? 'bg-gray-100 border-gray-200 cursor-not-allowed' : 'border-gray-300'
                            }`}
                        />
                    </div>

                    <div className="flex items-end">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">Auto-refresh (30s)</span>
                        </label>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={handleClearFilters}
                        className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg transition-colors"
                    >
                        Clear Filters
                    </button>
                    <button 
                        onClick={handleExportCSV}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        📥 Export CSV
                    </button>
                    <button 
                        onClick={() => fetchPunches()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        🔄 Refresh Table
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
                    <div className="text-3xl mb-2">📊</div>
                    <div className="text-3xl font-bold">{summary.totalRecords}</div>
                    <div className="text-blue-100 text-sm mt-1">Total Records</div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
                    <div className="text-3xl mb-2">✅</div>
                    <div className="text-3xl font-bold">{summary.todayPunches}</div>
                    <div className="text-green-100 text-sm mt-1">Today's Punches</div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
                    <div className="text-3xl mb-2">👥</div>
                    <div className="text-3xl font-bold">{summary.uniqueEmployees}</div>
                    <div className="text-purple-100 text-sm mt-1">Unique Employees</div>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-6 text-white">
                    <div className="text-3xl mb-2">🕐</div>
                    <div className="text-2xl font-bold">{summary.lastPunch ? formatTime(summary.lastPunch.time) : 'N/A'}</div>
                    <div className="text-orange-100 text-sm mt-1">{summary.lastPunch ? summary.lastPunch.employee : 'Last Punch'}</div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                    <th className="px-6 py-3 text-left text-sm font-semibold">S.No</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Employee ID</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Employee Name</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Device</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Time</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                                    <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPunches.length > 0 ? (
                                    filteredPunches.map((punch, index) => (
                                        <tr key={punch.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-900">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{punch.employee?.employeeCode || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {punch.employee ? 
                                                    `${punch.employee.firstName} ${punch.employee.lastName}` 
                                                    : 'Unknown'
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{punch.employee?.department?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="text-gray-900">{punch.device?.name || 'N/A'}</div>
                                                <div className="text-xs text-gray-500">{punch.device?.location}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{formatDate(punch.punchDate)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{formatTime(punch.punchTime)}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full font-semibold text-xs ${
                                                    punch.punchType === 'IN' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {punch.punchType === 'IN' ? '→ IN' : '← OUT'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-3 py-1 rounded-full font-semibold text-xs ${
                                                    punch.isLate
                                                        ? 'bg-red-100 text-red-800'
                                                        : punch.isEarlyOut
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {punch.isLate ? 'Late' : punch.isEarlyOut ? 'Early Out' : 'On Time'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                                            No punch records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className={`px-3 py-2 rounded-lg font-semibold text-sm ${
                                pagination.page === 1
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            ← Previous
                        </button>

                        <div className="flex gap-1">
                            {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`px-3 py-2 rounded-lg font-semibold text-sm ${
                                            pagination.page === pageNum
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {pagination.pages > 5 && (
                                <>
                                    <span className="px-2 py-2 text-gray-500">...</span>
                                    <button
                                        onClick={() => handlePageChange(pagination.pages)}
                                        className={`px-3 py-2 rounded-lg font-semibold text-sm ${
                                            pagination.page === pagination.pages
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                        }`}
                                    >
                                        {pagination.pages}
                                    </button>
                                </>
                            )}
                        </div>

                        <button 
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.pages}
                            className={`px-3 py-2 rounded-lg font-semibold text-sm ${
                                pagination.page === pagination.pages
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BiometricAttendance;