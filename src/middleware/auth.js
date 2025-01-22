const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper function to safely decode JWT without verification
function decodeToken(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return { error: error.message };
  }
}

const authMiddleware = async (req, res, next) => {
  const startTime = Date.now();
  const logContext = {
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  };

  try {
    console.log('[Auth] Starting authentication:', logContext);

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('[Auth] No authorization header:', logContext);
      return res.status(401).json({ error: 'No authorization header provided' });
    }

    const [bearer, token] = authHeader.split(' ');
    if (!bearer || bearer.toLowerCase() !== 'bearer' || !token) {
      console.log('[Auth] Invalid header format:', { ...logContext, received: authHeader });
      return res.status(401).json({ error: 'Invalid authorization header format' });
    }

    // Decode token for logging before verification
    const decoded = decodeToken(token);
    if (decoded.error) {
      console.log('[Auth] Token decode failed:', { ...logContext, error: decoded.error });
      return res.status(401).json({ 
        error: 'Invalid token format',
        details: process.env.NODE_ENV === 'development' ? decoded.error : undefined
      });
    }

    console.log('[Auth] Token decoded successfully:', { 
      ...logContext,
      tokenHeader: decoded.header,
      tokenExpiry: decoded.payload?.exp ? new Date(decoded.payload.exp * 1000).toISOString() : 'unknown'
    });

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('[Auth] Supabase verification failed:', { 
        ...logContext,
        error: error.message,
        errorCode: error.status
      });
      return res.status(401).json({ 
        error: 'Invalid token',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (!user) {
      console.log('[Auth] No user found:', logContext);
      return res.status(401).json({ error: 'User not found' });
    }

    // Add user and token to request for use in routes
    req.user = user;
    req.token = token;
    
    const duration = Date.now() - startTime;
    console.log('[Auth] Authentication successful:', { 
      ...logContext,
      userId: user.id,
      duration: `${duration}ms`
    });

    next();
  } catch (error) {
    console.error('[Auth] Unexpected error:', {
      ...logContext,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    res.status(500).json({ 
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = authMiddleware;
