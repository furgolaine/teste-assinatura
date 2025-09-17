const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');
const { reportValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Admin-only reports
router.get('/monthly-subscriptions', [...reportValidation.monthlyQuery, requireAdmin], reportsController.getMonthlySubscriptions);
router.get('/monthly-shipments', [...reportValidation.monthlyQuery, requireAdmin], reportsController.getMonthlyShipments);
router.get('/dashboard', requireAdmin, reportsController.getDashboardStats);

// User stats (available for both admin and owners)
router.get('/user-stats', requireOwnerOrAdmin, reportsController.getUserStats);

module.exports = router;

