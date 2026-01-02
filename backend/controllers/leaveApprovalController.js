// controllers/leaveApprovalController.js (Backend Controller)
const { LeaveApproval } = require('../models'); // Adjust path to your models
const { LeaveRequest } = require('../models'); // Assuming LeaveRequest model exists
const { Op } = require('sequelize');

// Get all approvals (with filters)
const getLeaveApprovals = async (req, res) => {
  try {
    const { approverId, status, companyId, departmentId } = req.query;
    const where = {};

    if (approverId) where.approverId = approverId;
    if (status && status !== 'all') where.status = status;
    if (companyId) where.companyId = companyId;

    // For department filtering, join with LeaveRequest (assuming it has departmentId)
    const include = [
      {
        model: LeaveRequest,
        as: 'leaveRequest', // Adjust association alias if defined in models
        required: true,
        attributes: ['id', 'employeeNumber', 'leaveTypeId', 'startDate', 'endDate', 'reason', 'departmentId'],
        where: departmentId ? { departmentId } : {}
      }
    ];

    const approvals = await LeaveApproval.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']]
    });

    res.json(approvals);
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve an approval
const approveLeaveApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, updatedBy } = req.body;

    const approval = await LeaveApproval.findByPk(id);
    if (!approval) {
      return res.status(404).json({ message: 'Approval not found' });
    }

    if (approval.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending approvals can be approved' });
    }

    await approval.approve(comments);
    // Optionally: Trigger notifications, update leave request status if all approvals done, etc.

    res.json({ message: 'Approval approved successfully', approval });
  } catch (error) {
    console.error('Error approving approval:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject an approval
const rejectLeaveApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, updatedBy } = req.body;

    if (!comments) {
      return res.status(400).json({ message: 'Comments are required for rejection' });
    }

    const approval = await LeaveApproval.findByPk(id);
    if (!approval) {
      return res.status(404).json({ message: 'Approval not found' });
    }

    if (approval.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending approvals can be rejected' });
    }

    await approval.reject(comments);
    // Optionally: Update leave request status to rejected, notify requester

    res.json({ message: 'Approval rejected successfully', approval });
  } catch (error) {
    console.error('Error rejecting approval:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forward an approval
const forwardLeaveApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments, updatedBy } = req.body;

    const approval = await LeaveApproval.findByPk(id);
    if (!approval) {
      return res.status(404).json({ message: 'Approval not found' });
    }

    if (approval.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending approvals can be forwarded' });
    }

    await approval.forward(comments);
    // Optionally: Create next-level approval record, notify next approver

    res.json({ message: 'Approval forwarded successfully', approval });
  } catch (error) {
    console.error('Error forwarding approval:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getLeaveApprovals,
  approveLeaveApproval,
  rejectLeaveApproval,
  forwardLeaveApproval
};