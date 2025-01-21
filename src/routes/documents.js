const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Protect all routes
router.use(authMiddleware);

// Get all documents
router.get('/', async (req, res) => {
  res.json({ message: 'Get all documents endpoint' });
});

// Get a specific document
router.get('/:id', async (req, res) => {
  res.json({ message: 'Get specific document endpoint' });
});

// Upload a new document
router.post('/', async (req, res) => {
  res.json({ message: 'Upload document endpoint' });
});

// Update document metadata
router.put('/:id', async (req, res) => {
  res.json({ message: 'Update document metadata endpoint' });
});

// Delete a document
router.delete('/:id', async (req, res) => {
  res.json({ message: 'Delete document endpoint' });
});

module.exports = router;
