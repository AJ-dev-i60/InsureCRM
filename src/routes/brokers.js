const express = require('express');
const router = express.Router();
const brokerService = require('../services/brokerService');
const Joi = require('joi');

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().required(),
  phone: Joi.string(),
  companyName: Joi.string(),
  licenseNumber: Joi.string(),
});

const updateSchema = Joi.object({
  fullName: Joi.string(),
  phone: Joi.string(),
  companyName: Joi.string(),
  licenseNumber: Joi.string(),
}).min(1);

// Register new broker
router.post('/register', async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const broker = await brokerService.registerBroker(req.body);
    res.status(201).json(broker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get broker profile
router.get('/profile', async (req, res) => {
  try {
    const brokerId = req.user.id; // Assuming middleware sets user
    const profile = await brokerService.getBrokerProfile(brokerId);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update broker profile
router.put('/profile', async (req, res) => {
  try {
    const { error } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const brokerId = req.user.id; // Assuming middleware sets user
    const updatedProfile = await brokerService.updateBrokerProfile(brokerId, req.body);
    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get broker dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const brokerId = req.user.id; // Assuming middleware sets user
    const stats = await brokerService.getBrokerDashboardStats(brokerId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
