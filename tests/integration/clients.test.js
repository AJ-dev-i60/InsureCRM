const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

const api = request(config.API_BASE_URL);

describe('Client Endpoints', () => {
  const testBroker = {
    email: `test.broker.${uuidv4()}@i60.co.za`,
    password: 'Test@2025',
    fullName: 'Test Broker',
    phone: '+27123456789',
    companyName: 'Test Insurance Co',
    licenseNumber: 'FSP12345'
  };

  const testClient = {
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe.${uuidv4()}@example.com`,
    phone: '+27123456789',
    address: '123 Test Street',
    idNumber: '1234567890123'
  };

  let authToken;
  let clientId;

  // Setup before all tests
  beforeAll(async () => {
    // Register and login broker
    await api
      .post('/api/auth/register')
      .send(testBroker);

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
      // Delete test client
      if (clientId) {
        await supabase
          .from('clients')
          .delete()
          .eq('id', clientId);
      }

      // Delete test broker
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

  describe('POST /api/clients', () => {
    it('should create a new client successfully', async () => {
      const response = await api
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testClient);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email', testClient.email);

      clientId = response.body.data.id;
    });

    it('should fail to create client with invalid data', async () => {
      const invalidClient = { ...testClient, email: 'invalid-email' };
      const response = await api
        .post('/api/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidClient);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/clients', () => {
    it('should get all clients successfully', async () => {
      const response = await api
        .get('/api/clients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/clients/:id', () => {
    it('should get client by ID successfully', async () => {
      const response = await api
        .get(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id', clientId);
      expect(response.body.data).toHaveProperty('email', testClient.email);
    });

    it('should fail with invalid client ID', async () => {
      const response = await api
        .get('/api/clients/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('PUT /api/clients/:id', () => {
    const updates = {
      firstName: 'Updated John',
      lastName: 'Updated Doe',
      phone: '+27987654321'
    };

    it('should update client successfully', async () => {
      const response = await api
        .put(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('first_name', updates.firstName);
      expect(response.body.data).toHaveProperty('last_name', updates.lastName);
    });

    it('should fail with invalid data', async () => {
      const invalidUpdates = { ...updates, phone: 'invalid-phone' };
      const response = await api
        .put(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdates);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('DELETE /api/clients/:id', () => {
    it('should delete client successfully', async () => {
      const response = await api
        .delete(`/api/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });

    it('should fail to delete non-existent client', async () => {
      const response = await api
        .delete(`/api/clients/${clientId}`) // Try to delete already deleted client
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });
});
