// LeaveApproval.jsx (Corrected Frontend Component)
import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

let token = sessionStorage.getItem("token");
let decoded = token ? jwtDecode(token) : "";
let userNumber = decoded?.userNumber || "system";

const LeaveApprovalManagement = ({ selectedCompanyId, selectedCompanyName }) => {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("Pending"); // tabs: all, pending, approved, rejected, forwarded
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [userDepartmentId, setUserDepartmentId] = useState(null);
  const [userId, setUserId] = useState(null); // Employee ID for approverId

  // Get leave type name by ID
  const getLeaveTypeName = (id) => {
    const type = leaveTypes.find((t) => t.leaveTypeId === id);
    return type ? type.leaveTypeName : "Unknown";
  };

  // Fetch leave request details for display
  const fetchLeaveDetails = async (leaveRequestId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/leaveRequests/${leaveRequestId}`);
      return res.data;
    } catch (err) {
      console.error("Failed to fetch leave details", err);
      return null;
    }
  };

  useEffect(() => {
    token = sessionStorage.getItem("token");
    decoded = token ? jwtDecode(token) : "";
    userNumber = decoded?.userNumber;
  }, []);

  // Fetch user details (role, department, employee ID)
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/users/byNumber/${userNumber}`);
        setUserRole(res.data.role);
        setUserDepartmentId(res.data.departmentId || null);
        setUserId(res.data.id); // Assuming 'id' is the employee ID
      } catch (err) {
        console.error("Failed to fetch user details", err);
        toast.error("Failed to fetch user details.");
      }
    };
    if (userNumber) fetchUserDetails();
  }, [userNumber]);

  // Fetch leave types
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/leaveTypes")
      .then((res) => setLeaveTypes(res.data))
      .catch((err) => console.error("Failed to fetch leave types", err));
  }, []);

  // Fetch approvals based on active tab and user role
  const fetchApprovals = async (status) => {
    setLoading(true);
    try {
      let url = "http://localhost:5000/api/leaveApprovals";
      const params = { approverId: userId }; // Default: approvals assigned to current user

      if (status !== "all") {
        params.status = status;
      }

      // Role-based filtering (override for admins)
      if (userRole === "Admin" && selectedCompanyId) {
        delete params.approverId; // Admins see company-wide
        params.companyId = selectedCompanyId;
      } else if (userRole === "Department Admin" && selectedCompanyId && userDepartmentId) {
        delete params.approverId; // Dept Admins see dept-wide
        params.companyId = selectedCompanyId;
        params.departmentId = userDepartmentId; // Assuming approvals can be filtered by dept via join
      }
      // Super Admin sees all, no filters

      const res = await axios.get(url, { params });
      
      // Enrich approvals with leave details
      const enrichedApprovals = await Promise.all(
        res.data.map(async (approval) => {
          const leave = await fetchLeaveDetails(approval.leaveRequestId);
          return { ...approval, leaveDetails: leave };
        })
      );
      setApprovals(enrichedApprovals);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch approvals.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId && userRole) {
      fetchApprovals(activeTab);
    }
  }, [activeTab, userId, userRole, selectedCompanyId, userDepartmentId]);

  // Handle Approve/Reject/Forward action
  const handleAction = async (approvalId, action, comments = "") => {
    setUpdating(true);
    try {
      await axios.put(`http://localhost:5000/api/leaveApprovals/${approvalId}/${action.toLowerCase()}`, {
        comments,
        updatedBy: userNumber
      });
      Swal.fire({
        icon: "success",
        title: action,
        text: `Leave approval ${action.toLowerCase()}d successfully!`
      });
      fetchApprovals(activeTab);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: `${action} Failed`,
        text: err.response?.data?.message || "An error occurred."
      });
    }
    setUpdating(false);
  };

  // Prompt for comments on reject/forward
  const confirmAction = (approvalId, action) => {
    if (action === "Reject" || action === "Forward") {
      Swal.fire({
        title: `${action} Approval`,
        input: "textarea",
        inputPlaceholder: "Enter comments (optional for forward, required for reject)...",
        inputValidator: (value) => {
          if (action === "Reject" && !value) return "Comments are required for rejection.";
        },
        showCancelButton: true,
        confirmButtonText: action
      }).then((result) => {
        if (result.isConfirmed) {
          handleAction(approvalId, action, result.value);
        }
      });
    } else {
      handleAction(approvalId, action);
    }
  };

  const tabs = [
    { id: "all", label: "All Approvals" },
    { id: "Pending", label: "Pending" },
    { id: "Approved", label: "Approved" },
    { id: "Rejected", label: "Rejected" },
    { id: "Forwarded", label: "Forwarded" },
  ];

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">
        Leave Approvals {selectedCompanyName ? `- ${selectedCompanyName}` : ""}
      </h1>

      {/* Tabs */}
      <div className="flex mb-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 -mb-px border-b-2 font-medium ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-gray-600 hover:text-blue-500"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div>Loading approvals...</div>
      ) : approvals.length === 0 ? (
        <p>No approvals found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2">Employee Number</th>
                <th className="border px-4 py-2">Leave Type</th>
                <th className="border px-4 py-2">From</th>
                <th className="border px-4 py-2">To</th>
                <th className="border px-4 py-2">Reason</th>
                <th className="border px-4 py-2">Level/Role</th>
                <th className="border px-4 py-2">Status</th>
                <th className="border px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((approval) => {
                const leave = approval.leaveDetails;
                if (!leave) return null;
                return (
                  <tr key={approval.id}>
                    <td className="border px-4 py-2">{leave.employeeNumber}</td>
                    <td className="border px-4 py-2">{getLeaveTypeName(leave.leaveTypeId)}</td>
                    <td className="border px-4 py-2">{leave.startDate}</td>
                    <td className="border px-4 py-2">{leave.endDate}</td>
                    <td className="border px-4 py-2">{leave.reason}</td>
                    <td className="border px-4 py-2">
                      Level: {approval.approverLevel} / {approval.approverRole || "N/A"}
                    </td>
                    <td className="border px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        approval.status === 'Pending' ? 'bg-yellow-200' :
                        approval.status === 'Approved' ? 'bg-green-200' :
                        approval.status === 'Rejected' ? 'bg-red-200' : 'bg-blue-200'
                      }`}>
                        {approval.status}
                      </span>
                    </td>
                    <td className="border px-4 py-2 space-x-2">
                      {approval.status === 'Pending' && (
                        <>
                          <button
                            className="bg-green-500 text-white px-2 py-1 rounded disabled:opacity-50"
                            onClick={() => confirmAction(approval.id, "Approved")}
                            disabled={updating}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="bg-red-500 text-white px-2 py-1 rounded disabled:opacity-50"
                            onClick={() => confirmAction(approval.id, "Reject")}
                            disabled={updating}
                          >
                            ✗ Reject
                          </button>
                          <button
                            className="bg-blue-500 text-white px-2 py-1 rounded disabled:opacity-50"
                            onClick={() => confirmAction(approval.id, "Forward")}
                            disabled={updating}
                          >
                            → Forward
                          </button>
                        </>
                      )}
                      {approval.comments && (
                        <button
                          className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
                          onClick={() => Swal.fire({ title: 'Comments', text: approval.comments })}
                        >
                          📝
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeaveApprovalManagement;