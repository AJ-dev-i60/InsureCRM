const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper function to decode JWT without verification
function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return { error: error.message };
  }
}

// Public route to check token format
router.post('/check-token', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(400).json({
        error: 'No authorization header',
        expected: 'Authorization: Bearer your-token-here',
        received: 'No header'
      });
    }

    const [bearer, token] = authHeader.split(' ');
    if (!bearer || bearer.toLowerCase() !== 'bearer' || !token) {
      return res.status(400).json({
        error: 'Invalid authorization header format',
        expected: 'Authorization: Bearer your-token-here',
        received: authHeader
      });
    }

    // Decode and analyze token
    const decoded = decodeToken(token);
    if (decoded.error) {
      return res.status(400).json({
        error: 'Token decode failed',
        details: decoded.error,
        receivedToken: token
      });
    }

    res.json({
      valid: true,
      format: 'JWT',
      header: decoded.header,
      payload: decoded.payload,
      tokenParts: {
        header: token.split('.')[0],
        payload: token.split('.')[1],
        signature: token.split('.')[2]
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Token check failed',
      details: error.message
    });
  }
});

// Protected route to verify token with Supabase
router.get('/verify-token', async (req, res) => {
  try {
    const user = req.user; // From auth middleware
    const token = req.token;

    res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        lastSignIn: user.last_sign_in_at
      },
      token: {
        decoded: decodeToken(token),
        expiresIn: new Date(user.exp * 1000).toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Token verification failed',
      details: error.message
    });
  }
});

// Protected route to show detailed auth debug info
router.get('/debug', async (req, res) => {
  try {
    const token = req.token;
    const user = req.user;

    // Test Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('test_connection')
      .select('*')
      .limit(1)
      .catch(err => ({ error: err }));

    res.json({
      auth: {
        token: {
          decoded: decodeToken(token),
          raw: token
        },
        user: {
          ...user,
          exp: user.exp ? new Date(user.exp * 1000).toISOString() : null
        }
      },
      supabase: {
        connection: {
          url: process.env.SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
          testResult: testError ? 'Failed' : 'Success',
          error: testError
        }
      },
      headers: {
        authorization: req.headers.authorization,
        contentType: req.headers['content-type'],
        accept: req.headers.accept
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Debug info collection failed',
      details: error.message
    });
  }
});

module.exports = router;
