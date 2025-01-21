const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authMiddleware = require('../middleware/auth');
const clientService = require('../services/clientService');

// Protect all routes
router.use(authMiddleware);

// Validation schemas
const createClientSchema = Joi.object({
  email: Joi.string().email().required().trim(),
  fullName: Joi.string().required().trim().min(2).max(100),
  phone: Joi.string().pattern(/^\+?[\d\s-()]{10,}$/).messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  address: Joi.string().trim().max(200),
  dateOfBirth: Joi.date().iso().less('now').messages({
    'date.less': 'Date of birth must be in the past'
  }),
  notes: Joi.string().trim().max(1000)
});

const updateClientSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(100),
  phone: Joi.string().pattern(/^\+?[\d\s-()]{10,}$/),
  address: Joi.string().trim().max(200),
  dateOfBirth: Joi.date().iso().less('now'),
  notes: Joi.string().trim().max(1000),
  status: Joi.string().valid('active', 'inactive')
}).min(1);

// Get all clients for the broker
router.get('/', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status,
      search: req.query.search,
      sortField: req.query.sortField,
      sortOrder: req.query.sortOrder
    };

    const result = await clientService.getClients(req.user.id, options);
    res.json({
      status: 'success',
      data: result.clients,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch clients'
    });
  }
});

// Get a specific client
router.get('/:id', async (req, res) => {
  try {
    const client = await clientService.getClientById(req.user.id, req.params.id);
    res.json({
      status: 'success',
      data: client
    });
  } catch (error) {
    console.error('Get client error:', error);
    
    if (error.message === 'Client not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch client details'
    });
  }
});

// Create a new client
router.post('/', async (req, res) => {
  try {
    const { error, value } = createClientSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'error',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }

    const client = await clientService.createClient(req.user.id, value);
    res.status(201).json({
      status: 'success',
      data: client
    });
  } catch (error) {
    console.error('Create client error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create client'
    });
  }
});

// Update a client
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updateClientSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'error',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }

    const client = await clientService.updateClient(req.user.id, req.params.id, value);
    res.json({
      status: 'success',
      data: client
    });
  } catch (error) {
    console.error('Update client error:', error);
    
    if (error.message === 'Client not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update client'
    });
  }
});

// Delete a client
router.delete('/:id', async (req, res) => {
  try {
    await clientService.deleteClient(req.user.id, req.params.id);
    res.json({
      status: 'success',
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Delete client error:', error);
    
    if (error.message === 'Client not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error.message.includes('active policies')) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to delete client'
    });
  }
});

module.exports = router;
