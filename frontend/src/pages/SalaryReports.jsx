import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SalaryReports = () => {
  const [activeTab, setActiveTab] = useState('salary-report');
  
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [filters, setFilters] = useState({
    companyId: '',
    employmentType: '',
    departmentId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [salaryReport, setSalaryReport] = useState({
    data: {},
    pagination: {},
    summary: {},
    comparison: {}
  });
  
  const [bankStatement, setBankStatement] = useState({
    data: {},
    summary: {}
  });

  const [payslipEmployees, setPayslipEmployees] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  const [loading, setLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const employmentTypes = ['Full-time', 'Part-time', 'Contract', 'Intern'];
  
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
    { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchCompanies();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'payslips' && filters.companyId) {
      fetchPayslipEmployees();
    }
  }, [activeTab, filters.companyId, filters.month, filters.year]);

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

  const fetchPayslipEmployees = async () => {
    try {
      const params = {
        companyId: filters.companyId,
        month: filters.month,
        year: filters.year,
        status: 'paid'
      };
      
      const response = await axios.get('http://localhost:5000/api/salary-generation', { params });
      setPayslipEmployees(response.data.data || []);
    } catch (error) {
      console.error('Error fetching payslip employees:', error);
    }
  };

  const fetchSalaryReport = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        page: currentPage,
        limit: itemsPerPage
      };
      
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const response = await axios.get('http://localhost:5000/api/reports/salary-report', { params });
      setSalaryReport(response.data);
    } catch (error) {
      console.error('Error fetching salary report:', error);
      alert('Failed to fetch salary report');
    } finally {
      setLoading(false);
    }
  };

  const fetchBankStatement = async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const response = await axios.get('http://localhost:5000/api/reports/bank-statement', { params });
      setBankStatement(response.data);
    } catch (error) {
      console.error('Error fetching bank statement:', error);
      alert('Failed to fetch bank statement');
    } finally {
      setLoading(false);
    }
  };

  const downloadSalaryReportPDF = async () => {
    setDownloadLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) delete params[key];
      });

      const response = await axios.get('http://localhost:5000/api/reports/salary-report/download/pdf', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `salary-report-${filters.month}-${filters.year}.pdf`);
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

  const downloadSalaryReportExcel = async () => {
    setDownloadLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) delete params[key];
      });

      const response = await axios.get('http://localhost:5000/api/reports/salary-report/download/excel', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `salary-report-${filters.month}-${filters.year}.xlsx`);
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

  const downloadBankStatementPDF = async () => {
    setDownloadLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) delete params[key];
      });

      const response = await axios.get('http://localhost:5000/api/reports/bank-statement/download/pdf', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bank-statement-${filters.month}-${filters.year}.pdf`);
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

  const downloadBankStatementExcel = async () => {
    setDownloadLoading(true);
    try {
      const params = { ...filters };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) delete params[key];
      });

      const response = await axios.get('http://localhost:5000/api/reports/bank-statement/download/excel', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bank-statement-${filters.month}-${filters.year}.xlsx`);
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

  const downloadPayslip = async (salaryGenerationId, empCode) => {
    setDownloadLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/reports/payslip/${salaryGenerationId}/download`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payslip-${empCode}-${filters.month}-${filters.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading payslip:', error);
      alert('Failed to download payslip');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1);
  };

  const handleSearch = () => {
    if (activeTab === 'salary-report') {
      fetchSalaryReport();
    } else if (activeTab === 'bank-statement') {
      fetchBankStatement();
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSalaryReport({ data: {}, pagination: {}, summary: {}, comparison: {} });
    setBankStatement({ data: {}, summary: {} });
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchSalaryReport();
  };

  const renderFilters = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
        {/* Company */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
          <select
            name="companyId"
            value={filters.companyId}
            onChange={handleFilterChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">All Companies</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.companyName}
              </option>
            ))}
          </select>
        </div>

        {/* Employment Type */}
        {activeTab === 'salary-report' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Employment Type</label>
            <select
              name="employmentType"
              value={filters.employmentType}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Types</option>
              {employmentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        )}

        {/* Department */}
        {activeTab === 'bank-statement' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
            <select
              name="departmentId"
              value={filters.departmentId}
              onChange={handleFilterChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.departmentName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Month */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Month</label>
          <select
            name="month"
            value={filters.month}
            onChange={handleFilterChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
          <select
            name="year"
            value={filters.year}
            onChange={handleFilterChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {loading ? '⏳ Loading...' : '🔍 Search'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderSalaryReport = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold text-gray-800">Department-wise Salary Report</h3>
        <div className="flex gap-3">
          <button
            onClick={downloadSalaryReportPDF}
            disabled={downloadLoading || Object.keys(salaryReport.data).length === 0}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            📄 Download PDF
          </button>
          <button
            onClick={downloadSalaryReportExcel}
            disabled={downloadLoading || Object.keys(salaryReport.data).length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            📊 Download Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {salaryReport.summary && Object.keys(salaryReport.summary).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-600">Total Records</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{salaryReport.summary.recordsCount || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <p className="text-sm font-medium text-gray-600">Page Total</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">₹{(salaryReport.summary.pageTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <p className="text-sm font-medium text-green-700">Grand Total</p>
            <p className="text-3xl font-bold text-green-700 mt-2">₹{(salaryReport.summary.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {/* Comparison Section */}
      {salaryReport.comparison && salaryReport.comparison.previousMonth !== undefined && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4">Month-over-Month Comparison</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <span className="text-sm text-gray-600">Previous Month:</span>
              <p className="text-xl font-bold text-gray-800 mt-2">₹{salaryReport.comparison.previousMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <span className="text-sm text-gray-600">Current Month:</span>
              <p className="text-xl font-bold text-gray-800 mt-2">₹{salaryReport.comparison.currentMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className={`border rounded-lg p-4 ${salaryReport.comparison.difference >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <span className={`text-sm font-medium ${salaryReport.comparison.difference >= 0 ? 'text-green-700' : 'text-red-700'}`}>Difference:</span>
              <p className={`text-xl font-bold mt-2 ${salaryReport.comparison.difference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {salaryReport.comparison.difference >= 0 ? '↑' : '↓'} 
                ₹{Math.abs(salaryReport.comparison.difference).toLocaleString('en-IN', { minimumFractionDigits: 2 })} 
                ({Math.abs(salaryReport.comparison.percentageChange)}%)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tables */}
      {Object.keys(salaryReport.data).length > 0 ? (
        Object.entries(salaryReport.data).map(([deptName, records]) => (
          <div key={deptName} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <h4 className="text-lg font-bold text-white">Department: {deptName}</h4>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Emp Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Basic</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">HRA</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Conveyance</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Medical</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Special</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Gross Pay</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">PF</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">ESI</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tax</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record, index) => {
                    const earnings = record.earningsBreakdown || {};
                    const deductions = record.deductionsBreakdown || {};
                    
                    return (
                      <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="px-4 py-3 text-sm text-gray-700">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{record.employee.employeeCode}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{record.employee.firstName} {record.employee.lastName}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">₹{(earnings.basicSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">₹{(earnings.hra || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">₹{(earnings.conveyance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">₹{(earnings.medicalAllowance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">₹{(earnings.specialAllowance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm font-bold bg-blue-50 text-blue-700 border-l-4 border-blue-500">₹{parseFloat(record.grossPay).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">₹{(deductions.providentFund || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">₹{(deductions.esi || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">₹{(deductions.incomeTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-sm font-bold bg-green-50 text-green-700 border-l-4 border-green-500">₹{parseFloat(record.netPay).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">
            {loading ? '⏳ Loading...' : 'No salary data available. Please adjust filters and search.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {salaryReport.pagination && salaryReport.pagination.totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center gap-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-800 font-semibold rounded-lg transition-colors duration-200"
          >
            Previous
          </button>
          
          <span className="text-gray-700 font-medium">
            Page {currentPage} of {salaryReport.pagination.totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === salaryReport.pagination.totalPages}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed text-gray-800 font-semibold rounded-lg transition-colors duration-200"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const renderBankStatement = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold text-gray-800">Department-wise Bank Statement</h3>
        <div className="flex gap-3">
          <button
            onClick={downloadBankStatementPDF}
            disabled={downloadLoading || Object.keys(bankStatement.data).length === 0}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            📄 Download PDF
          </button>
          <button
            onClick={downloadBankStatementExcel}
            disabled={downloadLoading || Object.keys(bankStatement.data).length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            📊 Download Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {bankStatement.summary && Object.keys(bankStatement.summary).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-600">Total Employees</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{bankStatement.summary.totalEmployees || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <p className="text-sm font-medium text-gray-600">Total Departments</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{bankStatement.summary.totalDepartments || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <p className="text-sm font-medium text-green-700">Total Amount</p>
            <p className="text-3xl font-bold text-green-700 mt-2">₹{(bankStatement.summary.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {/* Tables */}
      {Object.keys(bankStatement.data).length > 0 ? (
        Object.entries(bankStatement.data).map(([deptName, deptData]) => (
          <div key={deptName} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <h4 className="text-lg font-bold text-white">Department: {deptName}</h4>
              <span className="text-sm font-semibold text-blue-100">
                Total: ₹{deptData.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Emp Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Employee Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bank Account</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Bank Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">IFSC Code</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deptData.records.map((record, index) => (
                    <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{record.employee.employeeCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.employee.firstName} {record.employee.lastName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">{record.employee.bankAccountNumber || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.employee.bankName || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-mono">{record.employee.ifscCode || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm font-bold bg-green-50 text-green-700 border-l-4 border-green-500">₹{parseFloat(record.netPay).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">
            {loading ? '⏳ Loading...' : 'No bank statement data available. Please adjust filters and search.'}
          </p>
        </div>
      )}
    </div>
  );

  const renderPayslips = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold text-gray-800">Employee Payslips</h3>
        <p className="text-gray-600 mt-1">Download individual payslips for employees</p>
      </div>

      {/* Table */}
      {payslipEmployees.length > 0 ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">S.No</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Emp Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Employee Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Department</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Net Pay</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payslipEmployees.map((record, index) => (
                  <tr key={record.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{record.employee.employeeCode}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.employee.firstName} {record.employee.lastName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{record.employee.department?.departmentName || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm font-bold bg-green-50 text-green-700 border-l-4 border-green-500">₹{parseFloat(record.netPay).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        record.status === 'paid'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : record.status === 'pending'
                          ? 'bg-amber-100 text-amber-700 border border-amber-300'
                          : 'bg-red-100 text-red-700 border border-red-300'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => downloadPayslip(record.id, record.employee.employeeCode)}
                        disabled={downloadLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200 text-sm"
                      >
                        📥 Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">
            {loading ? '⏳ Loading...' : 'No payslips available for the selected period.'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">💰 Salary Reports</h1>
          <p className="text-gray-600 mt-2">Generate and download comprehensive salary reports</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-300">
          <button
            onClick={() => handleTabChange('salary-report')}
            className={`px-6 py-3 font-semibold transition-colors duration-200 border-b-2 ${
              activeTab === 'salary-report'
                ? 'text-blue-600 border-blue-600 bg-white rounded-t-lg'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            📊 Salary Report
          </button>
          <button
            onClick={() => handleTabChange('bank-statement')}
            className={`px-6 py-3 font-semibold transition-colors duration-200 border-b-2 ${
              activeTab === 'bank-statement'
                ? 'text-blue-600 border-blue-600 bg-white rounded-t-lg'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            🏦 Bank Statement
          </button>
          <button
            onClick={() => handleTabChange('payslips')}
            className={`px-6 py-3 font-semibold transition-colors duration-200 border-b-2 ${
              activeTab === 'payslips'
                ? 'text-blue-600 border-blue-600 bg-white rounded-t-lg'
                : 'text-gray-600 border-transparent hover:text-gray-800'
            }`}
          >
            📄 Payslips
          </button>
        </div>

        {/* Filters */}
        {renderFilters()}

        {/* Content */}
        {activeTab === 'salary-report' && renderSalaryReport()}
        {activeTab === 'bank-statement' && renderBankStatement()}
        {activeTab === 'payslips' && renderPayslips()}
      </div>
    </div>
  );
};

export default SalaryReports;