const express = require('express');
const router = express.Router();
const brokerService = require('../services/brokerService');
const Joi = require('joi');

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required().trim(),
  password: Joi.string().min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
      'string.min': 'Password must be at least 8 characters long'
    }),
  fullName: Joi.string().required().trim().min(2).max(100),
  phone: Joi.string().pattern(/^\+?[\d\s-()]{10,}$/).messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  companyName: Joi.string().trim().min(2).max(100),
  licenseNumber: Joi.string().trim(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().trim(),
  password: Joi.string().required()
});

// Register new broker
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request received');
    
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log('Validation error:', error.details);
      return res.status(400).json({
        status: 'error',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }

    console.log('Validation passed, attempting registration');
    
    const broker = await brokerService.registerBroker(value);
    res.status(201).json({
      status: 'success',
      data: broker
    });
  } catch (error) {
    console.error('Registration route error:', error);
    
    if (error.message.includes('already registered')) {
      return res.status(409).json({
        status: 'error',
        message: error.message
      });
    }

    // Return more detailed error message in development
    res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'development' 
        ? `Registration failed: ${error.message}`
        : 'An error occurred during registration. Please try again later.'
    });
  }
});

// Login broker
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received');
    
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      console.log('Login validation error:', error.details);
      return res.status(400).json({
        status: 'error',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }

    console.log('Login validation passed, attempting login');
    
    const { token, broker } = await brokerService.loginBroker(value.email, value.password);
    res.json({
      status: 'success',
      data: {
        token,
        broker
      }
    });
  } catch (error) {
    console.error('Login route error:', error);
    
    if (error.message.includes('Invalid credentials')) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    res.status(500).json({
      status: 'error',
      message: process.env.NODE_ENV === 'development'
        ? `Login failed: ${error.message}`
        : 'An error occurred during login. Please try again later.'
    });
  }
});

module.exports = router;
