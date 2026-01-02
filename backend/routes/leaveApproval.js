// routes/leaveApprovalRoutes.js (Backend Routes)
const express = require('express');
const router = express.Router();
const {
  getLeaveApprovals,
  approveLeaveApproval,
  rejectLeaveApproval,
  forwardLeaveApproval
} = require('../controllers/leaveApprovalController');

// GET /api/leaveApprovals - Fetch approvals with filters
router.get('/', getLeaveApprovals);

// PUT /api/leaveApprovals/:id/approve - Approve
router.put('/:id/approve', approveLeaveApproval);

// PUT /api/leaveApprovals/:id/reject - Reject
router.put('/:id/reject', rejectLeaveApproval);

// PUT /api/leaveApprovals/:id/forward - Forward
router.put('/:id/forward', forwardLeaveApproval);

module.exports = router;