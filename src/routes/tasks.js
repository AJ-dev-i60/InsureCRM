const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Protect all routes
router.use(authMiddleware);

// Get all tasks
router.get('/', async (req, res) => {
  res.json({ message: 'Get all tasks endpoint' });
});

// Get a specific task
router.get('/:id', async (req, res) => {
  res.json({ message: 'Get specific task endpoint' });
});

// Create a new task
router.post('/', async (req, res) => {
  res.json({ message: 'Create task endpoint' });
});

// Update a task
router.put('/:id', async (req, res) => {
  res.json({ message: 'Update task endpoint' });
});

// Delete a task
router.delete('/:id', async (req, res) => {
  res.json({ message: 'Delete task endpoint' });
});

module.exports = router;
