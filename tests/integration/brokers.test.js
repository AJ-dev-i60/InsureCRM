const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

const api = request(config.API_BASE_URL);

describe('Broker Endpoints', () => {
  const testBroker = {
    email: `test.broker.${uuidv4()}@i60.co.za`,
    password: 'Test@2025',
    fullName: 'Test Broker',
    phone: '+27123456789',
    companyName: 'Test Insurance Co',
    licenseNumber: 'FSP12345'
  };

  let authToken;
  let brokerId;

  // Setup before all tests
  beforeAll(async () => {
    // Register broker
    const registerResponse = await api
      .post('/api/auth/register')
      .send(testBroker);

    brokerId = registerResponse.body.data.id;

    // Login to get token
    const loginResponse = await api
      .post('/api/auth/login')
      .send({
        email: testBroker.email,
        password: testBroker.password
      });

    authToken = loginResponse.body.data.token;
  });

  // Cleanup after all tests
  afterAll(async () => {
    try {
      const { data: { user } } = await supabase.auth.admin.getUserByEmail(testBroker.email);
      if (user) {
        await supabase.auth.admin.deleteUser(user.id);
      }
      
      await supabase
        .from('brokers')
        .delete()
        .eq('email', testBroker.email);
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('GET /api/brokers/profile', () => {
    it('should get broker profile successfully', async () => {
      const response = await api
        .get('/api/brokers/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id', brokerId);
      expect(response.body.data).toHaveProperty('email', testBroker.email);
    });

    it('should fail without authentication', async () => {
      const response = await api
        .get('/api/brokers/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/brokers/profile', () => {
    const updates = {
      fullName: 'Updated Broker Name',
      phone: '+27987654321',
      companyName: 'Updated Insurance Co',
      licenseNumber: 'FSP54321'
    };

    it('should update broker profile successfully', async () => {
      const response = await api
        .put('/api/brokers/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('full_name', updates.fullName);
      expect(response.body.data).toHaveProperty('phone', updates.phone);
    });

    it('should fail to update with invalid data', async () => {
      const invalidUpdates = { ...updates, phone: 'invalid-phone' };
      const response = await api
        .put('/api/brokers/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdates);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/brokers/dashboard-stats', () => {
    it('should get dashboard statistics successfully', async () => {
      const response = await api
        .get('/api/brokers/dashboard-stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await api
        .get('/api/brokers/dashboard-stats');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });
});
