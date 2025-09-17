const express = require('express');
const router = express.Router();
const subscriptionsController = require('../controllers/subscriptionsController');
const { authenticateToken, requireOwnerOrAdmin } = require('../middleware/auth');
const { subscriptionValidation, idValidation } = require('../middleware/validation');

// Webhook route (no authentication required)
router.post('/webhook', subscriptionsController.handleWebhook);

// All other routes require authentication
router.use(authenticateToken);

// Get all subscriptions (admin sees all, owner sees only their own)
router.get('/', requireOwnerOrAdmin, subscriptionsController.getAllSubscriptions);

// Get subscription by ID
router.get('/:id', [...idValidation, requireOwnerOrAdmin], subscriptionsController.getSubscriptionById);

// Create new subscription
router.post('/', [...subscriptionValidation.create, requireOwnerOrAdmin], subscriptionsController.createSubscription);

// Update subscription
router.put('/:id', [...subscriptionValidation.update, requireOwnerOrAdmin], subscriptionsController.updateSubscription);

module.exports = router;

