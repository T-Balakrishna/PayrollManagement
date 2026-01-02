import React, { useState, useEffect } from "react";
import { FileText, User, Calendar, Plus, Clock, MapPin, Phone } from "lucide-react";
import axios from "axios";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber;

const LeaveRequestModal = ({ empId, companyId, departmentId }) => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [allocation, setAllocation] = useState(null);
  const [requestedDays, setRequestedDays] = useState(0);
  const [formData, setFormData] = useState({
    employeeId: empId || "",
    leaveTypeId: "",
    leaveCategory: "Full Day", // Default
    halfDayType: "", // AM/PM for half day
    reason: "",
    startDate: "",
    endDate: "",
    contactDuringLeave: "",
    addressDuringLeave: ""
  });
  const [documentFiles, setDocumentFiles] = useState([]);

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  // Fetch leave types filtered by companyId
  useEffect(() => {
    const fetchLeaveTypes = async () => {
      try {
        const url = companyId
          ? `http://localhost:5000/api/leaveTypes?companyId=${companyId}`
          : "http://localhost:5000/api/leaveTypes";
        const res = await axios.get(url);
        setLeaveTypes(res.data || []);
      } catch (err) {
        console.error("❌ Error fetching leave types:", err.response?.data?.error || err.message);
        setLeaveTypes([]);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to fetch leave types. Please try again.",
        });
      }
    };
    fetchLeaveTypes();
  }, [companyId]);

  // Fetch allocation whenever leaveType or startDate changes
  useEffect(() => {
    const fetchAllocation = async () => {
      if (!formData.leaveTypeId || !formData.startDate) return;
      try {
        const res = await axios.get("http://localhost:5000/api/leaveAllocations", {
          params: {
            employeeId: empId,
            leaveTypeId: formData.leaveTypeId
          }
        });
        console.log("Allocation data:", res.data);
        setAllocation(res.data[0] || null);
      } catch (err) {
        console.error("❌ Error fetching allocation:", err.response?.data?.error || err.message);
        setAllocation(null);
      }
    };
    fetchAllocation();
  }, [formData.leaveTypeId, formData.startDate, empId]);

  // Handle input changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setDocumentFiles(files);
  };

  // Calculate requested days (working days excluding weekends for Full Day)
  const calculateWorkingDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    let count = 0;
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return count;
  };

  // Update requestedDays based on category and dates
  useEffect(() => {
    let days = 0;
    if (formData.leaveCategory === "Half Day") {
      days = 0.5;
    } else if (formData.leaveCategory === "Short Leave") {
      days = 0.25;
    } else {
      days = calculateWorkingDays(formData.startDate, formData.endDate);
    }
    setRequestedDays(days);
  }, [formData.startDate, formData.endDate, formData.leaveCategory]);

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { leaveTypeId, startDate, endDate, reason, leaveCategory, halfDayType, contactDuringLeave, addressDuringLeave } = formData;

    // Validate dates
    if (dayjs(endDate).isBefore(dayjs(startDate))) {
      return Swal.fire({
        icon: "error",
        title: "Invalid Dates",
        text: "End Date cannot be earlier than Start Date"
      });
    }

    // Validate reason
    if (!reason || reason.trim().length === 0) {
      return Swal.fire({
        icon: "error",
        title: "Invalid Input",
        text: "Reason for leave is required"
      });
    }

    // Validate leave balance
    if (!allocation) {
      return Swal.fire({
        icon: "warning",
        title: "No Allocation",
        text: "No active leave allocation found for this leave type."
      });
    }
    const totalAllocated = parseFloat(allocation.allocatedLeaves || 0) + parseFloat(allocation.carryForwardFromPrevious || 0);
    const usedLeaves = parseFloat(allocation.usedLeaves || 0);
    const availableBalance = totalAllocated - usedLeaves;
    if (requestedDays > availableBalance) {
      return Swal.fire({
        icon: "warning",
        title: "Insufficient Balance",
        text: `Not enough leave balance available. You have ${availableBalance.toFixed(2)} days, requesting ${requestedDays.toFixed(2)} days.`
      });
    }

    // Prepare documentPaths (simulate upload; in real, upload files first)
    const documentPaths = documentFiles.length > 0 ? documentFiles.map(file => file.name) : []; // Placeholder

    try {
      await axios.post("http://localhost:5000/api/leaveRequests", {
        employeeId: empId,
        leaveTypeId,
        startDate,
        endDate,
        leaveCategory,
        halfDayType: leaveCategory === "Half Day" ? halfDayType : null,
        reason,
        contactDuringLeave,
        addressDuringLeave,
        documentPaths,
        companyId,
        submitImmediately: true
      });

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "Leave request submitted successfully!"
      });
      // Reset form
      setFormData({
        employeeId: empId,
        leaveTypeId: "",
        leaveCategory: "Full Day",
        halfDayType: "",
        reason: "",
        startDate: "",
        endDate: "",
        contactDuringLeave: "",
        addressDuringLeave: ""
      });
      setRequestedDays(0);
      setAllocation(null);
      setDocumentFiles([]);
    } catch (err) {
      console.error("❌ Error submitting leave request:", err.response?.data?.error || err.message);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.response?.data?.message || "Failed to submit leave request. Try again."
      });
    }
  };

  return (
    <div className="h-full bg-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Apply for Leave</h1>
            <p className="text-gray-600">Submit your leave request</p>
          </div>
        </div>

        {/* Leave Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-8">
          <div className="space-y-6">
            {/* Employee ID */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 text-blue-600" /> Employee ID
              </label>
              <input
                type="text"
                value={formData.employeeId}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600"
              />
            </div>

            {/* Leave Type */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-blue-600" /> Leave Type
              </label>
              <select
                name="leaveTypeId"
                value={formData.leaveTypeId}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">-- Select Leave Type --</option>
                {leaveTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              {/* Available Leaves */}
              {allocation && (
                <p className={`mt-2 font-semibold ${requestedDays > (allocation.allocatedLeaves + (allocation.carryForwardFromPrevious || 0) - (allocation.usedLeaves || 0)) ? 'text-red-600' : 'text-blue-700'}`}>
                  Available Balance: {((allocation.allocatedLeaves || 0) + (allocation.carryForwardFromPrevious || 0) - (allocation.usedLeaves || 0)).toFixed(2)} days
                  {requestedDays > ((allocation.allocatedLeaves || 0) + (allocation.carryForwardFromPrevious || 0) - (allocation.usedLeaves || 0)) && ' ⚠ Requested exceeds balance'}
                </p>
              )}
            </div>

            {/* Leave Category */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 text-blue-600" /> Leave Category
              </label>
              <select
                name="leaveCategory"
                value={formData.leaveCategory}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="Full Day">Full Day</option>
                <option value="Half Day">Half Day</option>
                <option value="Short Leave">Short Leave (2-4 hours)</option>
              </select>

              {/* Half Day Type */}
              {formData.leaveCategory === "Half Day" && (
                <div className="mt-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    Half Day Type
                  </label>
                  <select
                    name="halfDayType"
                    value={formData.halfDayType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">-- Select AM/PM --</option>
                    <option value="AM">AM (Morning)</option>
                    <option value="PM">PM (Afternoon)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-blue-600" /> Reason for Leave
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                required
                placeholder="Enter your reason for leave"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                  min={dayjs().format('YYYY-MM-DD')}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                  min={formData.startDate}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Requested Days Display */}
            {formData.leaveCategory === "Full Day" && (
              <p className="text-sm text-gray-600">Requested Working Days: {requestedDays}</p>
            )}

            {/* Contact During Leave */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 text-blue-600" /> Contact During Leave (Optional)
              </label>
              <input
                type="text"
                name="contactDuringLeave"
                value={formData.contactDuringLeave}
                onChange={handleChange}
                placeholder="Enter contact number/email during leave"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Address During Leave */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 text-blue-600" /> Address During Leave (Optional)
              </label>
              <textarea
                name="addressDuringLeave"
                value={formData.addressDuringLeave}
                onChange={handleChange}
                placeholder="Enter your address during leave period"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Documents Upload (Optional) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 text-blue-600" /> Supporting Documents (Optional)
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.png"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              {documentFiles.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">Selected: {documentFiles.length} file(s)</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Submit Leave Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestModal;