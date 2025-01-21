const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authMiddleware = require('../middleware/auth');
const policyService = require('../services/policyService');

// Protect all routes
router.use(authMiddleware);

// Validation schemas
const createPolicySchema = Joi.object({
  clientId: Joi.string().uuid().required(),
  policyNumber: Joi.string().required().trim().max(50),
  policyType: Joi.string().required().trim().max(100),
  provider: Joi.string().required().trim().max(100),
  premiumAmount: Joi.number().positive().required(),
  startDate: Joi.date().iso().required(),
  expiryDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  coverageDetails: Joi.object().required(),
  status: Joi.string().valid('draft', 'pending', 'active', 'cancelled', 'expired').default('draft')
});

const updatePolicySchema = Joi.object({
  policyType: Joi.string().trim().max(100),
  provider: Joi.string().trim().max(100),
  premiumAmount: Joi.number().positive(),
  startDate: Joi.date().iso(),
  expiryDate: Joi.date().iso().greater(Joi.ref('startDate')),
  coverageDetails: Joi.object(),
  status: Joi.string().valid('draft', 'pending', 'active', 'cancelled', 'expired')
}).min(1);

// Get all policies
router.get('/', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status,
      clientId: req.query.clientId,
      policyType: req.query.policyType,
      provider: req.query.provider,
      expiringBefore: req.query.expiringBefore,
      search: req.query.search,
      sortField: req.query.sortField,
      sortOrder: req.query.sortOrder
    };

    const result = await policyService.getPolicies(req.user.id, options);
    res.json({
      status: 'success',
      data: result.policies,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch policies'
    });
  }
});

// Get a specific policy
router.get('/:id', async (req, res) => {
  try {
    const policy = await policyService.getPolicyById(req.user.id, req.params.id);
    res.json({
      status: 'success',
      data: policy
    });
  } catch (error) {
    console.error('Get policy error:', error);
    
    if (error.message === 'Policy not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch policy details'
    });
  }
});

// Create a new policy
router.post('/', async (req, res) => {
  try {
    const { error, value } = createPolicySchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'error',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }

    const policy = await policyService.createPolicy(req.user.id, value.clientId, value);
    res.status(201).json({
      status: 'success',
      data: policy
    });
  } catch (error) {
    console.error('Create policy error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        status: 'error',
        message: error.message
      });
    }

    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create policy'
    });
  }
});

// Update a policy
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updatePolicySchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'error',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }

    const policy = await policyService.updatePolicy(req.user.id, req.params.id, value);
    res.json({
      status: 'success',
      data: policy
    });
  } catch (error) {
    console.error('Update policy error:', error);
    
    if (error.message === 'Policy not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update policy'
    });
  }
});

// Delete a policy
router.delete('/:id', async (req, res) => {
  try {
    await policyService.deletePolicy(req.user.id, req.params.id);
    res.json({
      status: 'success',
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    console.error('Delete policy error:', error);
    
    if (error.message === 'Policy not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    if (error.message.includes('active policy')) {
      return res.status(400).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to delete policy'
    });
  }
});

module.exports = router;
