// src/community/routes/communityAdmin.routes.js

const express = require("express");
const router = express.Router();
const communityAdminController = require("../controllers/communityAdmin.controller");
const communityAdminValidator = require("../validators/communityAdmin.validator");
const { authenticate } = require("../../middleware/auth");
const { verifyEmail } = require("../../middleware/verifyEmail");

// Role management - update a member's role
router.put(
    "/communities/:communityId/members/:userId/role",
    authenticate,
    verifyEmail,
    communityAdminValidator.validateRoleUpdate,
    communityAdminController.updateMemberRole
);

// Ownership transfer - initiate a transfer
router.post(
    "/communities/:communityId/transfer-ownership",
    authenticate,
    verifyEmail,
    communityAdminValidator.validateOwnershipTransfer,
    communityAdminController.initiateOwnershipTransfer
);

// Ownership transfer - respond to a transfer (accept, reject, cancel)
router.post(
    "/transfers/:transferId/respond",
    authenticate,
    communityAdminValidator.validateTransferResponse,
    communityAdminController.respondToOwnershipTransfer
);

// Ownership transfer - get transfer status
router.get(
    "/transfers/:transferId",
    authenticate,
    communityAdminController.getOwnershipTransferStatus
);

module.exports = router;
