const express = require('express');
const router = express.Router();
const propertiesController = require('../controllers/propertiesController');
const { authenticateToken, requireOwnerOrAdmin } = require('../middleware/auth');
const { propertyValidation, idValidation } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Get all properties (admin sees all, owner sees only their own)
router.get('/', requireOwnerOrAdmin, propertiesController.getAllProperties);

// Get property by ID
router.get('/:id', [...idValidation, requireOwnerOrAdmin], propertiesController.getPropertyById);

// Create new property
router.post('/', [...propertyValidation.create, requireOwnerOrAdmin], propertiesController.createProperty);

// Update property
router.put('/:id', [...propertyValidation.update, requireOwnerOrAdmin], propertiesController.updateProperty);

// Delete property
router.delete('/:id', [...propertyValidation.delete, requireOwnerOrAdmin], propertiesController.deleteProperty);

module.exports = router;

