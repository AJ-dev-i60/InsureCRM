const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth');
const documentService = require('../services/documentService');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Initialize storage bucket
(async () => {
    try {
        await documentService.initializeBucket();
    } catch (error) {
        console.error('Failed to initialize document storage:', error);
    }
})();

// Protect all routes
router.use(authMiddleware);

// Get all documents with filtering and pagination
router.get('/', async (req, res) => {
    try {
        const { client_id, policy_id, type, page = 1, limit = 20 } = req.query;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const documents = await documentService.listDocuments(req.user.id, {
            clientId: client_id,
            policyId: policy_id,
            type,
            from,
            to
        });

        res.json(documents);
    } catch (error) {
        console.error('Error listing documents:', error);
        res.status(500).json({ error: 'Failed to list documents' });
    }
});

// Get a specific document
router.get('/:id', async (req, res) => {
    try {
        const document = await documentService.getDocument(req.params.id, req.user.id);
        res.json(document);
    } catch (error) {
        console.error('Error fetching document:', error);
        if (error.message === 'Document not found') {
            res.status(404).json({ error: 'Document not found' });
        } else {
            res.status(500).json({ error: 'Failed to fetch document' });
        }
    }
});

// Upload a new document
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const metadata = {
            brokerId: req.user.id,
            clientId: req.body.client_id,
            policyId: req.body.policy_id,
            type: req.body.type
        };

        const document = await documentService.uploadDocument(req.file, metadata);
        res.status(201).json(document);
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

// Update document metadata
router.put('/:id', async (req, res) => {
    try {
        const updates = {
            document_type: req.body.type,
            client_id: req.body.client_id,
            policy_id: req.body.policy_id
        };

        const document = await documentService.updateDocument(req.params.id, req.user.id, updates);
        res.json(document);
    } catch (error) {
        console.error('Error updating document:', error);
        res.status(500).json({ error: 'Failed to update document' });
    }
});

// Delete a document
router.delete('/:id', async (req, res) => {
    try {
        await documentService.deleteDocument(req.params.id, req.user.id);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting document:', error);
        if (error.message === 'Document not found') {
            res.status(404).json({ error: 'Document not found' });
        } else {
            res.status(500).json({ error: 'Failed to delete document' });
        }
    }
});

module.exports = router;
