const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Initialize Supabase client
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  config.SUPABASE_OPTIONS
);

// Initialize API client
const api = request(config.API_BASE_URL);

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

describe('Authentication Endpoints', () => {
  // Generate unique test data
  const uniqueId = uuidv4().substring(0, 8);
  const testBroker = {
    email: `test.broker.${uniqueId}@i60.co.za`,
    password: 'Test@2025',
    fullName: 'Test Broker',
    phone: '+27123456789',
    companyName: 'Test Insurance Co',
    licenseNumber: 'FSP12345'
  };

  let authToken;

  // Cleanup after all tests
  afterAll(async () => {
    try {
      console.log('Cleaning up test data...');
      // Delete test user from auth
      const { data: { user } } = await supabase.auth.admin.getUserByEmail(testBroker.email);
      if (user) {
        console.log('Deleting user from Supabase auth:', user.id);
        await supabase.auth.admin.deleteUser(user.id);
      }
      
      // Delete test broker from database
      console.log('Deleting broker from database:', testBroker.email);
      const { error } = await supabase
        .from('brokers')
        .delete()
        .eq('email', testBroker.email);
      
      if (error) {
        console.error('Error deleting broker:', error);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new broker successfully', async () => {
      try {
        console.log('Attempting to register broker:', testBroker.email);
        const response = await api
          .post('/api/auth/register')
          .send(testBroker);

        console.log('Register response:', JSON.stringify(response.body, null, 2));

        // Check status code
        expect(response.status).toBe(201);
        
        // Check response structure
        expect(response.body).toHaveProperty('status', 'success');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('email', testBroker.email);
        expect(response.body.data).toHaveProperty('full_name', testBroker.fullName);
        expect(response.body.data).toHaveProperty('phone', testBroker.phone);

        // Wait for registration to fully complete
        await wait(2000);
      } catch (error) {
        console.error('Registration test error:', error.response?.body || error);
        throw error;
      }
    }, 30000);

    it('should fail to register with existing email', async () => {
      try {
        console.log('Attempting to register duplicate broker:', testBroker.email);
        const response = await api
          .post('/api/auth/register')
          .send(testBroker);

        console.log('Duplicate registration response:', JSON.stringify(response.body, null, 2));

        // Check status code
        expect(response.status).toBe(409);
        
        // Check response structure
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('already registered');
      } catch (error) {
        console.error('Duplicate registration test error:', error.response?.body || error);
        throw error;
      }
    });

    it('should fail to register with invalid data', async () => {
      try {
        const invalidData = { ...testBroker, email: 'invalid-email' };
        console.log('Attempting to register with invalid data:', invalidData);
        const response = await api
          .post('/api/auth/register')
          .send(invalidData);

        console.log('Invalid registration response:', JSON.stringify(response.body, null, 2));

        // Check status code
        expect(response.status).toBe(400);
        
        // Check response structure
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
        expect(response.body.errors.length).toBeGreaterThan(0);
        expect(response.body.errors[0]).toHaveProperty('field');
        expect(response.body.errors[0]).toHaveProperty('message');
      } catch (error) {
        console.error('Invalid registration test error:', error.response?.body || error);
        throw error;
      }
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      // Wait for any pending operations to complete
      await wait(1000);
    });

    it('should login successfully with valid credentials', async () => {
      try {
        console.log('Attempting to login with:', testBroker.email);
        const response = await api
          .post('/api/auth/login')
          .send({
            email: testBroker.email,
            password: testBroker.password
          });

        console.log('Login response:', JSON.stringify(response.body, null, 2));

        // Check status code
        expect(response.status).toBe(200);
        
        // Check response structure
        expect(response.body).toHaveProperty('status', 'success');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('broker');
        expect(response.body.data.broker).toHaveProperty('id');
        expect(response.body.data.broker).toHaveProperty('email', testBroker.email);

        authToken = response.body.data.token;
      } catch (error) {
        console.error('Login test error:', error.response?.body || error);
        throw error;
      }
    });

    it('should fail to login with invalid credentials', async () => {
      try {
        console.log('Attempting to login with invalid password');
        const response = await api
          .post('/api/auth/login')
          .send({
            email: testBroker.email,
            password: 'wrongpassword'
          });

        console.log('Invalid login response:', JSON.stringify(response.body, null, 2));

        // Check status code
        expect(response.status).toBe(401);
        
        // Check response structure
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toBe('Invalid email or password');
      } catch (error) {
        console.error('Invalid login test error:', error.response?.body || error);
        throw error;
      }
    });
  });
});
