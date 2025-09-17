const express = require('express');
const router = express.Router();
const plansController = require('../controllers/plansController');
const { authenticateToken, requireAdmin, requireOwnerOrAdmin } = require('../middleware/auth');
const { planValidation, idValidation } = require('../middleware/validation');

// Public routes (anyone can view plans)
router.get('/', plansController.getAllPlans);
router.get('/:id', idValidation, plansController.getPlanById);

// Admin-only routes
router.use(authenticateToken);
router.post('/', [...planValidation.create, requireAdmin], plansController.createPlan);
router.put('/:id', [...planValidation.update, requireAdmin], plansController.updatePlan);
router.delete('/:id', [...planValidation.delete, requireAdmin], plansController.deletePlan);

module.exports = router;

