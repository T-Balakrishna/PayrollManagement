// frontend/src/pages/EmployeeReports.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EmployeeReports = () => {
  const [activeTab, setActiveTab] = useState('employee-details');
  
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState([]);
  const [error, setError] = useState(null);
  
  const [filters, setFilters] = useState({
    company_id: '',
    department_id: '',
    employment_type_id: '',
    employee_id: '',
    employee_name: '',
    leave_type_id: '',
    from_date: '',
    to_date: '',
    status: 'Active',
    attendance_status: '',
    punch_type: '',
    year: new Date().getFullYear()
  });

  const [employeeData, setEmployeeData] = useState([]);
  const [leaveBalanceData, setLeaveBalanceData] = useState([]);
  const [leaveTakenData, setLeaveTakenData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [biometricData, setBiometricData] = useState([]);
  const [comprehensiveData, setComprehensiveData] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (filters.company_id) {
      fetchDepartments(filters.company_id);
      fetchEmployees(filters.company_id);
      fetchLeaveTypes(filters.company_id);
      fetchEmploymentTypes(filters.company_id);
    }
  }, [filters.company_id]);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/api/companies');
      const companiesData = (response.data || []).map(company => ({
        company_id: company.id,
        company_name: company.name,
        company_code: company.registrationNumber
      }));
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchDepartments = async (companyId) => {
    try {
      const response = await axios.get(`/api/departments`, {
        params: {
          company_id: companyId,
          companyId: companyId
        }
      });
      
      const depts = Array.isArray(response.data) ? response.data : (response.data.data || []);
      const mapped = depts.map(d => ({
        department_id: d.id || d.department_id,
        department_name: d.name || d.department_name,
        department_code: d.code || d.department_code
      }));
      
      setDepartments(mapped);
    } catch (error) {
      console.error('Department error:', error.response?.data);
      setDepartments([]);
    }
  };

  const fetchEmployees = async (companyId) => {
    try {
      const response = await axios.get(`/api/employees`, {
        params: {
          company_id: companyId,
          companyId: companyId,
          status: 'Active'
        }
      });
      
      const emps = Array.isArray(response.data) ? response.data : (response.data.data || []);
      const mapped = emps.map(e => ({
        employee_id: e.id || e.employee_id,
        employee_code: e.code || e.employee_code,
        employee_name: e.name || e.employee_name || `${e.firstName || ''} ${e.lastName || ''}`.trim()
      }));
      
      setEmployees(mapped);
    } catch (error) {
      console.error('Employee error:', error.response?.data);
      setEmployees([]);
    }
  };

  const fetchLeaveTypes = async (companyId) => {
    try {
      const response = await axios.get('/api/leave-types', {
        params: {
          companyId: companyId,
          company_id: companyId
        }
      });
      setLeaveTypes(Array.isArray(response.data) ? response.data : (response.data.data || []));
    } catch (error) {
      console.error('Leave types error:', error.response?.data);
      setLeaveTypes([]);
    }
  };

  const fetchEmploymentTypes = async (companyId) => {
    try {
      const response = await axios.get('/api/employment-types', {
        params: {
          companyId: companyId,
          company_id: companyId
        }
      });
      
      const mappedTypes = (response.data || []).map(type => ({
        employment_type_id: type.id,
        employment_type_name: type.name,
        employment_type_code: type.code
      }));
      
      setEmploymentTypes(mappedTypes);
    } catch (error) {
      console.error('Employment types error:', error.response?.data);
      setEmploymentTypes([]);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchEmployeeDetails = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const response = await axios.get('/api/employee-reports/employee-details', {
        params,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.data && Array.isArray(response.data.data)) {
        setEmployeeData(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      } else {
        throw new Error('Invalid data structure received from server');
      }
    } catch (error) {
      console.error('Error fetching employee details:', error);
      const errorMessage = error.response?.data?.message || error.message;
      setEmployeeData([]);
      setError(`Failed to fetch employee details: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveBalance = async () => {
    if (!filters.company_id) {
      alert('Please select a company');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('company_id', filters.company_id);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.leave_type_id) params.append('leave_type_id', filters.leave_type_id);
      params.append('year', filters.year);

      const response = await axios.get(`/api/employee-reports/leave-balance?${params}`);
      setLeaveBalanceData(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      alert('Failed to fetch leave balance: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTaken = async () => {
    if (!filters.from_date || !filters.to_date) {
      alert('Please select from date and to date');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', filters.company_id);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.leave_type_id) params.append('leave_type_id', filters.leave_type_id);
      params.append('from_date', filters.from_date);
      params.append('to_date', filters.to_date);
      if (filters.status) params.append('status', filters.status);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const response = await axios.get(`/api/employee-reports/leave-taken?${params}`);
      setLeaveTakenData(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0
      }));
    } catch (error) {
      console.error('Error fetching leave taken:', error);
      alert('Failed to fetch leave taken: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    if (!filters.from_date || !filters.to_date) {
      alert('Please select from date and to date');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', filters.company_id);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      params.append('from_date', filters.from_date);
      params.append('to_date', filters.to_date);
      if (filters.attendance_status) params.append('attendance_status', filters.attendance_status);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const response = await axios.get(`/api/employee-reports/attendance?${params}`);
      setAttendanceData(response.data.data || []);
      setAttendanceSummary(response.data.summary || {});
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0
      }));
    } catch (error) {
      console.error('Error fetching attendance:', error);
      alert('Failed to fetch attendance: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchBiometric = async () => {
    if (!filters.from_date || !filters.to_date) {
      alert('Please select from date and to date');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', filters.company_id);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      params.append('from_date', filters.from_date);
      params.append('to_date', filters.to_date);
      if (filters.punch_type) params.append('punch_type', filters.punch_type);
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      const response = await axios.get(`/api/employee-reports/biometric?${params}`);
      setBiometricData(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        totalPages: response.data.pagination?.totalPages || 0
      }));
    } catch (error) {
      console.error('Error fetching biometric data:', error);
      alert('Failed to fetch biometric data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchComprehensive = async () => {
    if (!filters.employee_id) {
      alert('Please select an employee');
      return;
    }
    if (!filters.from_date || !filters.to_date) {
      alert('Please select from date and to date');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('employee_id', filters.employee_id);
      params.append('from_date', filters.from_date);
      params.append('to_date', filters.to_date);

      const response = await axios.get(`/api/employee-reports/comprehensive?${params}`);
      setComprehensiveData(response.data.data || null);
    } catch (error) {
      console.error('Error fetching comprehensive report:', error);
      alert('Failed to fetch comprehensive report: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    
    switch (activeTab) {
      case 'employee-details':
        fetchEmployeeDetails();
        break;
      case 'leave-balance':
        fetchLeaveBalance();
        break;
      case 'leave-taken':
        fetchLeaveTaken();
        break;
      case 'attendance':
        fetchAttendance();
        break;
      case 'biometric':
        fetchBiometric();
        break;
      case 'comprehensive':
        fetchComprehensive();
        break;
      default:
        break;
    }
  };

  const handleDownloadExcel = async () => {
    if (activeTab !== 'employee-details') return;

    setDownloadLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', filters.company_id);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.employment_type_id) params.append('employment_type_id', filters.employment_type_id);
      if (filters.status) params.append('status', filters.status);

      const response = await axios.get(
        `/api/employee-reports/export/employee-details-excel?${params}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `employee_details_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Failed to download Excel: ' + (error.response?.data?.message || error.message));
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (activeTab !== 'employee-details') return;

    setDownloadLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.company_id) params.append('company_id', filters.company_id);
      if (filters.department_id) params.append('department_id', filters.department_id);
      if (filters.employment_type_id) params.append('employment_type_id', filters.employment_type_id);
      if (filters.status) params.append('status', filters.status);

      const response = await axios.get(
        `/api/employee-reports/export/employee-details-pdf?${params}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `employee_details_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    setTimeout(handleSearch, 0);
  };

  const renderFilters = () => {
    switch (activeTab) {
      case 'employee-details':
        return (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                <select
                  name="company_id"
                  value={filters.company_id}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Companies</option>
                  {companies.map(company => (
                    <option key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                <select
                  name="department_id"
                  value={filters.department_id}
                  onChange={handleFilterChange}
                  disabled={!filters.company_id}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Type</label>
                <select
                  name="employment_type_id"
                  value={filters.employment_type_id}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Types</option>
                  {employmentTypes.map(type => (
                    <option key={type.employment_type_id} value={type.employment_type_id}>
                      {type.employment_type_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Employee</label>
                <select
                  name="employee_id"
                  value={filters.employee_id}
                  onChange={handleFilterChange}
                  disabled={!filters.company_id}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100"
                >
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_code} - {emp.employee_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Search by Name</label>
                <input
                  type="text"
                  name="employee_name"
                  value={filters.employee_name}
                  onChange={handleFilterChange}
                  placeholder="Type employee name..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button 
                onClick={handleSearch} 
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button 
                onClick={handleDownloadPDF} 
                disabled={downloadLoading || employeeData.length === 0}
                className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {downloadLoading ? 'Downloading...' : 'Download PDF'}
              </button>
              <button 
                onClick={handleDownloadExcel}
                disabled={downloadLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                📊 Download Excel
              </button>
            </div>
          </div>
        );

      case 'leave-balance':
        return (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company *</label>
                <select
                  name="company_id"
                  value={filters.company_id}
                  onChange={handleFilterChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select Company</option>
                  {companies.map(company => (
                    <option key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                <select
                  name="department_id"
                  value={filters.department_id}
                  onChange={handleFilterChange}
                  disabled={!filters.company_id}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Employee</label>
                <select
                  name="employee_id"
                  value={filters.employee_id}
                  onChange={handleFilterChange}
                  disabled={!filters.company_id}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100"
                >
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_code} - {emp.employee_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type</label>
                <select
                  name="leave_type_id"
                  value={filters.leave_type_id}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Leave Types</option>
                  {leaveTypes.map(type => (
                    <option key={type.leave_type_id} value={type.leave_type_id}>
                      {type.leave_type_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
                <select
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <button 
              onClick={handleSearch} 
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        );

      case 'leave-taken':
      case 'attendance':
      case 'biometric':
        return (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
                <select
                  name="company_id"
                  value={filters.company_id}
                  onChange={handleFilterChange}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Companies</option>
                  {companies.map(company => (
                    <option key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                <select
                  name="department_id"
                  value={filters.department_id}
                  onChange={handleFilterChange}
                  disabled={!filters.company_id}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Employee</label>
                <select
                  name="employee_id"
                  value={filters.employee_id}
                  onChange={handleFilterChange}
                  disabled={!filters.company_id}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100"
                >
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_code} - {emp.employee_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">From Date *</label>
                <input
                  type="date"
                  name="from_date"
                  value={filters.from_date}
                  onChange={handleFilterChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">To Date *</label>
                <input
                  type="date"
                  name="to_date"
                  value={filters.to_date}
                  onChange={handleFilterChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {activeTab === 'leave-taken' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Leave Type</label>
                  <select
                    name="leave_type_id"
                    value={filters.leave_type_id}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">All Leave Types</option>
                    {leaveTypes.map(type => (
                      <option key={type.leave_type_id} value={type.leave_type_id}>
                        {type.leave_type_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'attendance' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Attendance Status</label>
                  <select
                    name="attendance_status"
                    value={filters.attendance_status}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">All Status</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Leave">Leave</option>
                    <option value="Holiday">Holiday</option>
                  </select>
                </div>
              )}

              {activeTab === 'biometric' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Punch Type</label>
                  <select
                    name="punch_type"
                    value={filters.punch_type}
                    onChange={handleFilterChange}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">All Types</option>
                    <option value="In">Check In</option>
                    <option value="Out">Check Out</option>
                  </select>
                </div>
              )}
            </div>

            <button 
              onClick={handleSearch} 
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        );

      case 'comprehensive':
        return (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Company *</label>
                <select
                  name="company_id"
                  value={filters.company_id}
                  onChange={handleFilterChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Select Company</option>
                  {companies.map(company => (
                    <option key={company.company_id} value={company.company_id}>
                      {company.company_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Employee *</label>
                <select
                  name="employee_id"
                  value={filters.employee_id}
                  onChange={handleFilterChange}
                  disabled={!filters.company_id}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-slate-100"
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>
                      {emp.employee_code} - {emp.employee_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">From Date *</label>
                <input
                  type="date"
                  name="from_date"
                  value={filters.from_date}
                  onChange={handleFilterChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">To Date *</label>
                <input
                  type="date"
                  name="to_date"
                  value={filters.to_date}
                  onChange={handleFilterChange}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button 
              onClick={handleSearch} 
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderEmployeeDetailsTable = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (error) return <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>;
    if (employeeData.length === 0) return <div className="py-8 text-center text-slate-500">No employee data found</div>;

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <th className="px-6 py-3 text-left text-sm font-semibold">Emp Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Company</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Designation</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Employment Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Mobile</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">DOJ</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {employeeData.map((emp, index) => (
                <tr key={emp.employee_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{emp.employee_code}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">{emp.employee_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{emp.company_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{emp.department_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{emp.designation_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{emp.employment_type_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{emp.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{emp.mobile}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages} (Total: {pagination.total} records)
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderLeaveBalanceTable = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (leaveBalanceData.length === 0) return <div className="py-8 text-center text-slate-500">No leave balance data found</div>;

    const groupedData = leaveBalanceData.reduce((acc, item) => {
      if (!acc[item.employee_id]) {
        acc[item.employee_id] = {
          employee_code: item.employee_code,
          employee_name: item.employee_name,
          company_name: item.company_name,
          department_name: item.department_name,
          employment_type_name: item.employment_type_name,
          leaves: []
        };
      }
      acc[item.employee_id].leaves.push(item);
      return acc;
    }, {});

    return (
      <div className="grid gap-6">
        {Object.values(groupedData).map((employee) => (
          <div key={employee.employee_code} className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800">{employee.employee_code} - {employee.employee_name}</h3>
              <div className="flex gap-4 mt-2 text-sm text-slate-600">
                <span><strong>Company:</strong> {employee.company_name}</span>
                <span><strong>Department:</strong> {employee.department_name}</span>
                <span><strong>Type:</strong> {employee.employment_type_name}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employee.leaves.map((leave) => (
                <div key={leave.leave_type_id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-blue-600 mb-3">{leave.leave_type_name}</h4>
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Allowed</span>
                      <span className="font-semibold">{leave.total_allowed}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Used</span>
                      <span className="font-semibold text-red-600">{leave.total_used}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Balance</span>
                      <span className="font-semibold text-green-600">{leave.balance}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all" 
                      style={{ width: `${(leave.total_used / leave.total_allowed) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLeaveTakenTable = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (leaveTakenData.length === 0) return <div className="py-8 text-center text-slate-500">No leave data found</div>;

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <th className="px-6 py-3 text-left text-sm font-semibold">Emp Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Employee Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Company</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Leave Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">From Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">To Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Days</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Reason</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leaveTakenData.map((leave, index) => (
                <tr key={leave.leave_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{leave.employee_code}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">{leave.employee_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.company_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.department_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.leave_type_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{new Date(leave.from_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{new Date(leave.to_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.total_days}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{leave.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      leave.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {leave.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAttendanceTable = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (attendanceData.length === 0) return <div className="py-8 text-center text-slate-500">No attendance data found</div>;

    return (
      <>
        {Object.keys(attendanceSummary).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Present</h4>
              <p className="text-2xl font-bold text-blue-600">{attendanceSummary.present || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Absent</h4>
              <p className="text-2xl font-bold text-red-600">{attendanceSummary.absent || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">Leave</h4>
              <p className="text-2xl font-bold text-amber-600">{attendanceSummary.leave || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Holiday</h4>
              <p className="text-2xl font-bold text-green-600">{attendanceSummary.holiday || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-800 mb-2">Late Entries</h4>
              <p className="text-2xl font-bold text-purple-600">{attendanceSummary.late_entries || 0}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                  <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Emp Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Employee Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Company</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Check In</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Check Out</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Total Hours</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Late By (min)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {attendanceData.map((att, index) => (
                  <tr key={att.attendance_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${att.is_late ? 'border-l-4 border-red-500' : ''} hover:bg-blue-50 transition-colors`}>
                    <td className="px-6 py-4 text-sm text-slate-800">{new Date(att.attendance_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-800">{att.employee_code}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{att.employee_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{att.company_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{att.department_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        att.attendance_status === 'Present' ? 'bg-green-100 text-green-800' :
                        att.attendance_status === 'Absent' ? 'bg-red-100 text-red-800' :
                        att.attendance_status === 'Leave' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {att.attendance_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{att.check_in_time || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{att.check_out_time || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{att.total_hours ? att.total_hours.toFixed(2) : 'N/A'}</td>
                    <td className={`px-6 py-4 text-sm font-semibold ${att.is_late ? 'text-red-600' : 'text-slate-700'}`}>
                      {att.is_late ? att.late_by_minutes : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderBiometricTable = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (biometricData.length === 0) return <div className="py-8 text-center text-slate-500">No biometric data found</div>;

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Time</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Emp Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Employee Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Company</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Punch Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Device</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {biometricData.map((punch, index) => (
                <tr key={punch.punch_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                  <td className="px-6 py-4 text-sm text-slate-800">{new Date(punch.punch_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">{punch.punch_time}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-800">{punch.employee_code}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">{punch.employee_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{punch.company_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{punch.department_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      punch.punch_type === 'In' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {punch.punch_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{punch.device_name || punch.device_id}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{punch.location || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderComprehensiveReport = () => {
    if (loading) return <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>;
    if (!comprehensiveData) return <div className="py-8 text-center text-slate-500">No data found. Please search for an employee.</div>;

    const { employee_details, leave_balance, leave_taken, attendance_summary, attendance_details } = comprehensiveData;

    return (
      <div className="space-y-6">
        {/* Employee Details Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">📋 Employee Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Employee Code</p>
              <p className="text-sm font-bold text-slate-800">{employee_details.employee_code}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Name</p>
              <p className="text-sm font-bold text-slate-800">{employee_details.employee_name}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Company</p>
              <p className="text-sm font-bold text-slate-800">{employee_details.company_name}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Department</p>
              <p className="text-sm font-bold text-slate-800">{employee_details.department_name}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Designation</p>
              <p className="text-sm font-bold text-slate-800">{employee_details.designation_name}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Employment Type</p>
              <p className="text-sm font-bold text-slate-800">{employee_details.employment_type_name}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Email</p>
              <p className="text-sm font-bold text-slate-800">{employee_details.email}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Mobile</p>
              <p className="text-sm font-bold text-slate-800">{employee_details.mobile}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">DOJ</p>
              <p className="text-sm font-bold text-slate-800">{new Date(employee_details.date_of_joining).toLocaleDateString()}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Status</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                employee_details.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {employee_details.status}
              </span>
            </div>
          </div>
        </div>

        {/* Leave Balance Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">📊 Leave Balance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {leave_balance.map((leave, index) => (
              <div key={index} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 className="font-bold text-blue-600 mb-3">{leave.leave_type_name}</h4>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total</span>
                    <span className="font-semibold">{leave.total_allowed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Used</span>
                    <span className="font-semibold text-red-600">{leave.total_used}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Balance</span>
                    <span className="font-semibold text-green-600">{leave.balance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leave Taken Section */}
        {leave_taken.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">🏖️ Leave Taken</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">Leave Type</th>
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">From Date</th>
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">To Date</th>
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">Days</th>
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">Reason</th>
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {leave_taken.map((leave, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 text-slate-800">{leave.leave_type}</td>
                      <td className="px-4 py-3 text-slate-800">{new Date(leave.from_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-800">{new Date(leave.to_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-slate-800">{leave.total_days}</td>
                      <td className="px-4 py-3 text-slate-800">{leave.reason}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          leave.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Summary Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">📅 Attendance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Present</h4>
              <p className="text-2xl font-bold text-blue-600">{attendance_summary.present}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Absent</h4>
              <p className="text-2xl font-bold text-red-600">{attendance_summary.absent}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">Leave</h4>
              <p className="text-2xl font-bold text-amber-600">{attendance_summary.leave}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Holiday</h4>
              <p className="text-2xl font-bold text-green-600">{attendance_summary.holiday}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-800 mb-2">Late Entries</h4>
              <p className="text-2xl font-bold text-purple-600">{attendance_summary.late_entries}</p>
            </div>
          </div>
        </div>

        {/* Attendance Details Section */}
        {attendance_details.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">📊 Attendance Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">Date</th>
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">Status</th>
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">Check In</th>
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">Check Out</th>
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">Total Hours</th>
                    <th className="px-4 py-2 text-left text-slate-700 font-semibold">Late</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attendance_details.map((att, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 text-slate-800">{new Date(att.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          att.status === 'Present' ? 'bg-green-100 text-green-800' :
                          att.status === 'Absent' ? 'bg-red-100 text-red-800' :
                          att.status === 'Leave' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {att.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{att.check_in || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-800">{att.check_out || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-800">{att.total_hours ? att.total_hours.toFixed(2) : 'N/A'}</td>
                      <td className={`px-4 py-3 font-semibold ${att.is_late ? 'text-red-600' : 'text-slate-700'}`}>
                        {att.is_late ? '⚠️ Late' : '✓'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 flex items-center gap-3">
          <span className="text-4xl">📊</span>
          Employee Reports Dashboard
        </h1>
        <p className="text-slate-600 mt-2">Comprehensive employee reporting with attendance, leave, and biometric tracking</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-lg shadow-md p-3">
        {[
          { id: 'employee-details', label: '📋 Employee Details' },
          { id: 'leave-balance', label: '📊 Leave Balance' },
          { id: 'leave-taken', label: '🏖️ Leave Taken' },
          { id: 'attendance', label: '📅 Attendance' },
          { id: 'biometric', label: '🔐 Biometric' },
          { id: 'comprehensive', label: '📑 Comprehensive' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-6">
        {renderFilters()}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'employee-details' && renderEmployeeDetailsTable()}
        {activeTab === 'leave-balance' && renderLeaveBalanceTable()}
        {activeTab === 'leave-taken' && renderLeaveTakenTable()}
        {activeTab === 'attendance' && renderAttendanceTable()}
        {activeTab === 'biometric' && renderBiometricTable()}
        {activeTab === 'comprehensive' && renderComprehensiveReport()}
      </div>
    </div>
  );
};

export default EmployeeReports;
