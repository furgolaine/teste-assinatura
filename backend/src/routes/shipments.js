const express = require('express');
const router = express.Router();
const shipmentsController = require('../controllers/shipmentsController');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');
const { shipmentValidation, idValidation } = require('../middleware/validation');

// Webhook route (no authentication required)
router.post('/tracking-webhook', shipmentsController.handleTrackingWebhook);

// All other routes require authentication
router.use(authenticateToken);

// Get all shipments (admin sees all, owner sees only their own)
router.get('/', requireOwnerOrAdmin, shipmentsController.getAllShipments);

// Get shipment by ID
router.get('/:id', [...idValidation, requireOwnerOrAdmin], shipmentsController.getShipmentById);

// Create new shipment (admin only)
router.post('/', [...shipmentValidation.create, requireAdmin], shipmentsController.createShipment);

// Update shipment status (admin only)
router.put('/:id/status', [...shipmentValidation.updateStatus, requireAdmin], shipmentsController.updateShipmentStatus);

// Generate shipping label (admin only)
router.post('/generate-label', [...shipmentValidation.generateLabel, requireAdmin], shipmentsController.generateLabel);

// Get monthly shipments report (admin only)
router.get('/reports/monthly', requireAdmin, shipmentsController.getMonthlyShipments);

module.exports = router;

