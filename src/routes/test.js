const express = require('express');
const router = express.Router();
const emailService = require('../services/email/emailService');
const authMiddleware = require('../middleware/auth');

// This route should be removed in production
router.post('/test-email', authMiddleware, async (req, res) => {
    try {
        const testData = {
            broker: {
                firstName: 'Test',
                lastName: 'Broker',
                email: req.body.brokerEmail || 'test@example.com',
                phone: '+27123456789'
            },
            client: {
                firstName: 'Test',
                lastName: 'Client',
                email: req.body.clientEmail || 'test@example.com'
            },
            policy: {
                policyNumber: 'TEST-001',
                type: 'Life Insurance',
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            }
        };

        await emailService.sendPolicyExpiryNotification(
            testData.broker,
            testData.client,
            testData.policy
        );

        res.json({ success: true, message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Test email failed:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send test email',
            error: error.message 
        });
    }
});

module.exports = router;
