// frontend/src/pages/StatutoryReports.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StatutoryReports = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  const [activeTab, setActiveTab] = useState('pf');
  
  // Dropdown options
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    companyId: '',
    departmentId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    quarter: '',
    state: '',
    status: '',
    loanType: ''
  });

  // Report data
  const [pfReport, setPFReport] = useState({ data: [], totals: {}, companyInfo: {} });
  const [esiReport, setESIReport] = useState({ data: [], totals: {}, companyInfo: {} });
  const [taxReport, setTaxReport] = useState({ data: [], totals: {}, companyInfo: {} });
  const [ptReport, setPTReport] = useState({ data: [], stateWiseData: {}, totals: {}, companyInfo: {} });
  const [loanReport, setLoanReport] = useState({ data: [], totals: {} });

  // Loading states
  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Options
  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  const loanTypes = ['Personal Loan', 'Home Loan', 'Vehicle Loan', 'Education Loan', 'Emergency Loan', 'Advance'];
  
  const loanStatuses = ['pending', 'active', 'completed', 'cancelled'];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal'
  ];

  // ==========================================
  // FETCH DROPDOWN DATA
  // ==========================================
  
  useEffect(() => {
    fetchCompanies();
    fetchDepartments();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/companies');
      setCompanies(response.data.data || []);
      if (response.data.data.length > 0) {
        setFilters(prev => ({ ...prev, companyId: response.data.data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  // ==========================================
  // FETCH REPORTS
  // ==========================================

  const fetchPFReport = async () => {
    setLoading(true);
    try {
      const params = {
        month: filters.month,
        year: filters.year
      };
      if (filters.companyId) params.companyId = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;

      const response = await axios.get('http://localhost:5000/api/statutory-reports/pf', { params });
      setPFReport(response.data);
    } catch (error) {
      console.error('Error fetching PF report:', error);
      alert('Failed to fetch PF report');
    } finally {
      setLoading(false);
    }
  };

  const fetchESIReport = async () => {
    setLoading(true);
    try {
      const params = {
        month: filters.month,
        year: filters.year
      };
      if (filters.companyId) params.companyId = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;

      const response = await axios.get('http://localhost:5000/api/statutory-reports/esi', { params });
      setESIReport(response.data);
    } catch (error) {
      console.error('Error fetching ESI report:', error);
      alert('Failed to fetch ESI report');
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxReport = async () => {
    setLoading(true);
    try {
      const params = {
        year: filters.year
      };
      
      if (filters.quarter) {
        params.quarter = filters.quarter;
      } else {
        params.month = filters.month;
      }
      
      if (filters.companyId) params.companyId = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;

      const response = await axios.get('http://localhost:5000/api/statutory-reports/tax', { params });
      setTaxReport(response.data);
    } catch (error) {
      console.error('Error fetching tax report:', error);
      alert('Failed to fetch tax report');
    } finally {
      setLoading(false);
    }
  };

  const fetchPTReport = async () => {
    setLoading(true);
    try {
      const params = {
        month: filters.month,
        year: filters.year
      };
      if (filters.companyId) params.companyId = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.state) params.state = filters.state;

      const response = await axios.get('http://localhost:5000/api/statutory-reports/professional-tax', { params });
      setPTReport(response.data);
    } catch (error) {
      console.error('Error fetching PT report:', error);
      alert('Failed to fetch Professional Tax report');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.companyId) params.companyId = filters.companyId;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.status) params.status = filters.status;
      if (filters.loanType) params.loanType = filters.loanType;

      const response = await axios.get('http://localhost:5000/api/statutory-reports/loan', { params });
      setLoanReport(response.data);
    } catch (error) {
      console.error('Error fetching loan report:', error);
      alert('Failed to fetch loan report');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // DOWNLOAD FUNCTIONS
  // ==========================================

  const downloadPFReportPDF = async () => {
    setDownloadLoading(true);
    try {
      const params = {
        month: filters.month,
        year: filters.year
      };
      if (filters.companyId) params.companyId = filters.companyId;

      const response = await axios.get('http://localhost:5000/api/statutory-reports/pf/download/pdf', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pf-report-${filters.month}-${filters.year}.pdf`);
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

  const downloadStatutoryReportsExcel = async (reportType = null) => {
    setDownloadLoading(true);
    try {
      const params = {
        month: filters.month,
        year: filters.year
      };
      if (filters.companyId) params.companyId = filters.companyId;
      if (reportType) params.reportType = reportType;

      const response = await axios.get('http://localhost:5000/api/statutory-reports/download/excel', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = reportType ? `${reportType}-report-${filters.month}-${filters.year}.xlsx` : `statutory-reports-${filters.month}-${filters.year}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('Failed to download Excel');
    } finally {
      setDownloadLoading(false);
    }
  };

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    switch (activeTab) {
      case 'pf':
        fetchPFReport();
        break;
      case 'esi':
        fetchESIReport();
        break;
      case 'tax':
        fetchTaxReport();
        break;
      case 'pt':
        fetchPTReport();
        break;
      case 'loan':
        fetchLoanReport();
        break;
      default:
        break;
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPFReport({ data: [], totals: {}, companyInfo: {} });
    setESIReport({ data: [], totals: {}, companyInfo: {} });
    setTaxReport({ data: [], totals: {}, companyInfo: {} });
    setPTReport({ data: [], stateWiseData: {}, totals: {}, companyInfo: {} });
    setLoanReport({ data: [], totals: {} });
  };

  // ==========================================
  // RENDER FUNCTIONS
  // ==========================================

  const renderFilters = () => {
    const needsMonth = ['pf', 'esi', 'pt'].includes(activeTab);
    const needsQuarter = activeTab === 'tax';
    const needsState = activeTab === 'pt';
    const needsLoanFilters = activeTab === 'loan';

    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-2">Company</label>
            <select
              name="companyId"
              value={filters.companyId}
              onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Companies</option>
              {companies.map(company => (
                <option key={company.id} value={company.id}>
                  {company.companyName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-semibold text-gray-700 mb-2">Department</label>
            <select
              name="departmentId"
              value={filters.departmentId}
              onChange={handleFilterChange}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.departmentName}
                </option>
              ))}
            </select>
          </div>

          {needsMonth && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Month *</label>
              <select
                name="month"
                value={filters.month}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {needsQuarter && (
            <>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">Month</label>
                <select
                  name="month"
                  value={filters.month}
                  onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={filters.quarter !== ''}
                >
                  <option value="">Select Month</option>
                  {months.map(month => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">OR Quarter</label>
                <select
                  name="quarter"
                  value={filters.quarter}
                  onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Quarter</option>
                  {quarters.map(q => (
                    <option key={q} value={q}>{q}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {!needsLoanFilters && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">Year *</label>
              <select
                name="year"
                value={filters.year}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {needsState && (
            <div className="flex flex-col">
              <label className="text-sm font-semibold text-gray-700 mb-2">State</label>
              <select
                name="state"
                value={filters.state}
                onChange={handleFilterChange}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All States</option>
                {indianStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          )}

          {needsLoanFilters && (
            <>
              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">Loan Type</label>
                <select
                  name="loanType"
                  value={filters.loanType}
                  onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  {loanTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  {loanStatuses.map(status => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex flex-col justify-end">
            <button 
              onClick={handleSearch} 
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? '⏳ Loading...' : '🔍 Search'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPFReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">📊 Provident Fund (PF) Report</h3>
            {pfReport.companyInfo.pfNumber && (
              <p className="text-sm text-gray-600">PF Number: <span className="font-semibold">{pfReport.companyInfo.pfNumber}</span></p>
            )}
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button 
              onClick={downloadPFReportPDF} 
              disabled={downloadLoading || pfReport.data.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
            >
              📄 Download PDF
            </button>
            <button 
              onClick={() => downloadStatutoryReportsExcel('pf')} 
              disabled={downloadLoading || pfReport.data.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
            >
              📊 Download Excel
            </button>
          </div>
        </div>

        {pfReport.totals && Object.keys(pfReport.totals).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pfReport.totals.employeeCount || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total PF Wage</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{(pfReport.totals.totalPFWage || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Employee PF</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">₹{(pfReport.totals.totalEmployeePF || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Employer Contribution</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">₹{(pfReport.totals.totalEmployerContribution || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total PF</p>
              <p className="text-2xl font-bold text-green-900 mt-1">₹{(pfReport.totals.totalPF || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        )}

        {pfReport.data.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Emp Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Employee Name</th>
                  <th className="px-4 py-3 text-left font-semibold">UAN Number</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-right font-semibold">PF Wage</th>
                  <th className="px-4 py-3 text-right font-semibold">Employee PF (12%)</th>
                  <th className="px-4 py-3 text-right font-semibold">Employer EPF</th>
                  <th className="px-4 py-3 text-right font-semibold">Employer EPS</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Employer</th>
                  <th className="px-4 py-3 text-right font-semibold">Total PF</th>
                </tr>
              </thead>
              <tbody>
                {pfReport.data.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{item.employee.employeeCode}</td>
                    <td className="px-4 py-3 text-gray-900">{item.employee.firstName} {item.employee.lastName}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.uanNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.department?.departmentName || 'N/A'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{item.pfWage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-blue-700 font-semibold">₹{item.employeePF.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{item.employerEPF.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{item.employerEPS.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-orange-700 font-semibold">₹{item.totalEmployerContribution.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-bold">₹{item.totalPF.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {loading ? '⏳ Loading...' : 'No PF data available. Please adjust filters and search.'}
          </div>
        )}
      </div>
    </div>
  );

  const renderESIReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">🏥 ESI (Employee State Insurance) Report</h3>
            {esiReport.companyInfo.esiNumber && (
              <p className="text-sm text-gray-600">ESI Number: <span className="font-semibold">{esiReport.companyInfo.esiNumber}</span></p>
            )}
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={() => downloadStatutoryReportsExcel('esi')} 
              disabled={downloadLoading || esiReport.data.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
            >
              📊 Download Excel
            </button>
          </div>
        </div>

        {esiReport.totals && Object.keys(esiReport.totals).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{esiReport.totals.employeeCount || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Gross Pay</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{(esiReport.totals.totalGrossPay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Employee ESI (0.75%)</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">₹{(esiReport.totals.totalEmployeeESI || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Employer ESI (3.25%)</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">₹{(esiReport.totals.totalEmployerESI || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total ESI</p>
              <p className="text-2xl font-bold text-green-900 mt-1">₹{(esiReport.totals.totalESI || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        )}

        {esiReport.data.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Emp Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Employee Name</th>
                  <th className="px-4 py-3 text-left font-semibold">ESI Number</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-right font-semibold">Gross Pay</th>
                  <th className="px-4 py-3 text-right font-semibold">Working Days</th>
                  <th className="px-4 py-3 text-right font-semibold">Present Days</th>
                  <th className="px-4 py-3 text-right font-semibold">Employee ESI</th>
                  <th className="px-4 py-3 text-right font-semibold">Employer ESI</th>
                  <th className="px-4 py-3 text-right font-semibold">Total ESI</th>
                </tr>
              </thead>
              <tbody>
                {esiReport.data.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{item.employee.employeeCode}</td>
                    <td className="px-4 py-3 text-gray-900">{item.employee.firstName} {item.employee.lastName}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.esiNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.department?.departmentName || 'N/A'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{item.grossPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.workingDays}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.presentDays}</td>
                    <td className="px-4 py-3 text-right text-blue-700 font-semibold">₹{item.employeeESI.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-orange-700 font-semibold">₹{item.employerESI.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-green-700 font-bold">₹{item.totalESI.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {loading ? '⏳ Loading...' : 'No ESI data available. Please adjust filters and search.'}
          </div>
        )}
      </div>
    </div>
  );

  const renderTaxReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">💰 Tax Deduction (TDS) Report</h3>
            {taxReport.companyInfo.tanNumber && (
              <p className="text-sm text-gray-600">TAN Number: <span className="font-semibold">{taxReport.companyInfo.tanNumber}</span></p>
            )}
            {taxReport.period && (
              <p className="text-sm text-gray-600">Period: <span className="font-semibold">{taxReport.period}</span></p>
            )}
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={() => downloadStatutoryReportsExcel('tax')} 
              disabled={downloadLoading || taxReport.data.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
            >
              📊 Download Excel
            </button>
          </div>
        </div>

        {taxReport.totals && Object.keys(taxReport.totals).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{taxReport.totals.employeeCount || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Gross</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{(taxReport.totals.totalGross || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Total Tax Deducted</p>
              <p className="text-2xl font-bold text-red-900 mt-1">₹{(taxReport.totals.totalTaxDeducted || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        )}

        {taxReport.data.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Emp Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Employee Name</th>
                  <th className="px-4 py-3 text-left font-semibold">PAN Number</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Gross</th>
                  <th className="px-4 py-3 text-right font-semibold">Total Tax Deducted</th>
                  <th className="px-4 py-3 text-left font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {taxReport.data.map((item, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{item.employee.employeeCode}</td>
                    <td className="px-4 py-3 text-gray-900">{item.employee.firstName} {item.employee.lastName}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.panNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.department?.departmentName || 'N/A'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{item.totalGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-bold">₹{item.totalTaxDeducted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800 font-semibold">View Months ({item.months.length})</summary>
                        <div className="mt-3 bg-blue-50 p-3 rounded border border-blue-200 space-y-2">
                          {item.months.map((month, idx) => (
                            <div key={idx} className="text-xs text-gray-700">
                              <span className="font-semibold">{months.find(m => m.value === month.month)?.label} {month.year}:</span> Gross ₹{month.grossPay.toFixed(2)}, Tax ₹{month.taxDeducted.toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {loading ? '⏳ Loading...' : 'No tax data available. Please adjust filters and search.'}
          </div>
        )}
      </div>
    </div>
  );

  const renderPTReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">📑 Professional Tax Report</h3>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={() => downloadStatutoryReportsExcel('pt')} 
              disabled={downloadLoading || ptReport.data.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
            >
              📊 Download Excel
            </button>
          </div>
        </div>

        {ptReport.totals && Object.keys(ptReport.totals).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{ptReport.totals.employeeCount || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">States Covered</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{ptReport.totals.stateCount || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Gross Pay</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{(ptReport.totals.totalGrossPay || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Total Professional Tax</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">₹{(ptReport.totals.totalPT || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        )}

        {Object.keys(ptReport.stateWiseData).length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-bold text-gray-900 mb-4">State-wise Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(ptReport.stateWiseData).map(([state, data]) => (
                <div key={state} className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm font-bold text-gray-900 mb-3">{state}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-700">
                      <span className="font-semibold">Employees:</span>
                      <span className="font-bold">{data.count}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-700">
                      <span className="font-semibold">Total PT:</span>
                      <span className="font-bold text-purple-700">₹{data.totalPT.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {ptReport.data.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Emp Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Employee Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-left font-semibold">State</th>
                  <th className="px-4 py-3 text-right font-semibold">Gross Pay</th>
                  <th className="px-4 py-3 text-right font-semibold">Professional Tax</th>
                </tr>
              </thead>
              <tbody>
                {ptReport.data.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{item.employee.employeeCode}</td>
                    <td className="px-4 py-3 text-gray-900">{item.employee.firstName} {item.employee.lastName}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.department?.departmentName || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                        {item.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{item.grossPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-purple-700 font-bold">₹{item.professionalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {loading ? '⏳ Loading...' : 'No Professional Tax data available. Please adjust filters and search.'}
          </div>
        )}
      </div>
    </div>
  );

  const renderLoanReport = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">💳 Loan & Advance Report</h3>
          <div className="mt-4 md:mt-0">
            <button 
              onClick={() => downloadStatutoryReportsExcel('loan')} 
              disabled={downloadLoading || loanReport.data.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
            >
              📊 Download Excel
            </button>
          </div>
        </div>

        {loanReport.totals && Object.keys(loanReport.totals).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Loans</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{loanReport.totals.totalLoans || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Active Loans</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{loanReport.totals.activeLoans || 0}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Completed Loans</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{loanReport.totals.completedLoans || 0}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total Loan Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{(loanReport.totals.totalLoanAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Total Paid</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">₹{(loanReport.totals.totalPaidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-900 mt-1">₹{(loanReport.totals.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        )}

        {loanReport.data.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left font-semibold">Emp Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Employee Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Department</th>
                  <th className="px-4 py-3 text-left font-semibold">Loan Type</th>
                  <th className="px-4 py-3 text-right font-semibold">Loan Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Installment</th>
                  <th className="px-4 py-3 text-center font-semibold">Paid / Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Paid Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">Outstanding</th>
                  <th className="px-4 py-3 text-center font-semibold">Progress</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loanReport.data.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{item.employee.employeeCode}</td>
                    <td className="px-4 py-3 text-gray-900">{item.employee.firstName} {item.employee.lastName}</td>
                    <td className="px-4 py-3 text-gray-700">{item.employee.department?.departmentName || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        {item.loanType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{item.loanAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{item.installmentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-center text-gray-700 font-semibold">{item.paidInstallments} / {item.numberOfInstallments}</td>
                    <td className="px-4 py-3 text-right text-gray-700">₹{item.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-red-700 font-bold">₹{item.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full" 
                            style={{ width: `${item.completionPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-8">{item.completionPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'active' ? 'bg-green-100 text-green-800' :
                        item.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {loading ? '⏳ Loading...' : 'No loan data available. Please adjust filters and search.'}
          </div>
        )}
      </div>
    </div>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">📋 Statutory Compliance Reports</h1>
        <p className="text-gray-600 mt-2">PF, ESI, Tax, Professional Tax & Loan Reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => handleTabChange('pf')}
          className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition duration-200 ${activeTab === 'pf' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          📊 PF Report
        </button>
        <button
          onClick={() => handleTabChange('esi')}
          className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition duration-200 ${activeTab === 'esi' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          🏥 ESI Report
        </button>
        <button
          onClick={() => handleTabChange('tax')}
          className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition duration-200 ${activeTab === 'tax' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          💰 Tax (TDS)
        </button>
        <button
          onClick={() => handleTabChange('pt')}
          className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition duration-200 ${activeTab === 'pt' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          📑 Professional Tax
        </button>
        <button
          onClick={() => handleTabChange('loan')}
          className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition duration-200 ${activeTab === 'loan' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
        >
          💳 Loans & Advances
        </button>
      </div>

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      {activeTab === 'pf' && renderPFReport()}
      {activeTab === 'esi' && renderESIReport()}
      {activeTab === 'tax' && renderTaxReport()}
      {activeTab === 'pt' && renderPTReport()}
      {activeTab === 'loan' && renderLoanReport()}
    </div>
  );
};

export default StatutoryReports;