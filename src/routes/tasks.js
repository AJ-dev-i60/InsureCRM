const express = require('express');
const router = express.Router();
const Joi = require('joi');
const authMiddleware = require('../middleware/auth');
const taskService = require('../services/taskService');

// Protect all routes
router.use(authMiddleware);

// Validation schemas
const createTaskSchema = Joi.object({
  clientId: Joi.string().uuid(),
  policyId: Joi.string().uuid(),
  title: Joi.string().required().trim().max(200),
  description: Joi.string().trim().max(1000),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').default('pending'),
  dueDate: Joi.date().iso().required(),
  reminderDate: Joi.date().iso().less(Joi.ref('dueDate'))
}).or('clientId', 'policyId');

const updateTaskSchema = Joi.object({
  clientId: Joi.string().uuid(),
  policyId: Joi.string().uuid(),
  title: Joi.string().trim().max(200),
  description: Joi.string().trim().max(1000),
  priority: Joi.string().valid('low', 'medium', 'high'),
  status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled'),
  dueDate: Joi.date().iso(),
  reminderDate: Joi.date().iso().less(Joi.ref('dueDate'))
}).min(1);

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status,
      priority: req.query.priority,
      clientId: req.query.clientId,
      policyId: req.query.policyId,
      dueBefore: req.query.dueBefore,
      dueAfter: req.query.dueAfter,
      search: req.query.search,
      sortField: req.query.sortField,
      sortOrder: req.query.sortOrder
    };

    const result = await taskService.getTasks(req.user.id, options);
    res.json({
      status: 'success',
      data: result.tasks,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch tasks'
    });
  }
});

// Get a specific task
router.get('/:id', async (req, res) => {
  try {
    const task = await taskService.getTaskById(req.user.id, req.params.id);
    res.json({
      status: 'success',
      data: task
    });
  } catch (error) {
    console.error('Get task error:', error);
    
    if (error.message === 'Task not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch task details'
    });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { error, value } = createTaskSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'error',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }

    const task = await taskService.createTask(req.user.id, value);
    res.status(201).json({
      status: 'success',
      data: task
    });
  } catch (error) {
    console.error('Create task error:', error);
    
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create task'
    });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  try {
    const { error, value } = updateTaskSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        status: 'error',
        errors: error.details.map(detail => ({
          field: detail.path[0],
          message: detail.message
        }))
      });
    }

    const task = await taskService.updateTask(req.user.id, req.params.id, value);
    res.json({
      status: 'success',
      data: task
    });
  } catch (error) {
    console.error('Update task error:', error);
    
    if (error.message === 'Task not found') {
      return res.status(404).json({
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
      message: 'Failed to update task'
    });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    await taskService.deleteTask(req.user.id, req.params.id);
    res.json({
      status: 'success',
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    
    if (error.message === 'Task not found') {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to delete task'
    });
  }
});

module.exports = router;
