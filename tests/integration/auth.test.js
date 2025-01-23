const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

const api = request(config.API_BASE_URL);

describe('Authentication Endpoints', () => {
  const testBroker = {
    email: `test.broker.${uuidv4()}@i60.co.za`,
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
      // Delete test user from auth
      const { data: { user } } = await supabase.auth.admin.getUserByEmail(testBroker.email);
      if (user) {
        await supabase.auth.admin.deleteUser(user.id);
      }
      
      // Delete test broker from database
      await supabase
        .from('brokers')
        .delete()
        .eq('email', testBroker.email);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new broker successfully', async () => {
      try {
        const response = await api
          .post('/api/auth/register')
          .send(testBroker);

        console.log('Register response:', response.body);

        expect(response.status).toBe(201);
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('email', testBroker.email);
      } catch (error) {
        console.error('Registration test error:', error);
        throw error;
      }
    });

    it('should fail to register with existing email', async () => {
      try {
        const response = await api
          .post('/api/auth/register')
          .send(testBroker);

        console.log('Duplicate registration response:', response.body);

        expect(response.status).toBe(409);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('already registered');
      } catch (error) {
        console.error('Duplicate registration test error:', error);
        throw error;
      }
    });

    it('should fail to register with invalid data', async () => {
      try {
        const invalidData = { ...testBroker, email: 'invalid-email' };
        const response = await api
          .post('/api/auth/register')
          .send(invalidData);

        console.log('Invalid registration response:', response.body);

        expect(response.status).toBe(400);
        expect(response.body.status).toBe('error');
        expect(response.body.errors).toBeDefined();
      } catch (error) {
        console.error('Invalid registration test error:', error);
        throw error;
      }
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      try {
        const response = await api
          .post('/api/auth/login')
          .send({
            email: testBroker.email,
            password: testBroker.password
          });

        console.log('Login response:', response.body);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('broker');

        authToken = response.body.data.token;
      } catch (error) {
        console.error('Login test error:', error);
        throw error;
      }
    });

    it('should fail to login with invalid credentials', async () => {
      try {
        const response = await api
          .post('/api/auth/login')
          .send({
            email: testBroker.email,
            password: 'wrongpassword'
          });

        console.log('Invalid login response:', response.body);

        expect(response.status).toBe(401);
        expect(response.body.status).toBe('error');
        expect(response.body.message).toContain('Invalid');
      } catch (error) {
        console.error('Invalid login test error:', error);
        throw error;
      }
    });
  });
});
