require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const authMiddleware = require('./middleware/auth');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Initialize services
require('./services/schedulerService');
const emailService = require('./services/email/emailService');

// Middleware
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://xsajojwpszfwfvviqoyu.supabase.co"]
    }
  }
}));
app.use(express.json());

// Serve static files from the React/Vue.js app
app.use(express.static(path.join(__dirname, '../client/build')));

// Public routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public auth routes
app.use('/api/auth', require('./routes/auth'));

// Auth debug routes - some public, some protected
app.use('/api/auth-debug', require('./routes/auth-debug'));

// Protected API routes
const apiRouter = express.Router();
apiRouter.use(authMiddleware);  // Apply auth middleware only to API routes

apiRouter.use('/test', require('./routes/test'));
apiRouter.use('/brokers', require('./routes/brokers'));
apiRouter.use('/clients', require('./routes/clients'));
apiRouter.use('/policies', require('./routes/policies'));
apiRouter.use('/tasks', require('./routes/tasks'));
apiRouter.use('/documents', require('./routes/documents'));

// Mount API routes under /api
app.use('/api', apiRouter);

// Serve React/Vue.js app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Email notification service initialized');
});
