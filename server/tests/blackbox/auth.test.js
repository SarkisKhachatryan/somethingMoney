/**
 * Black Box Tests for Authentication Module
 * Tests the API endpoints without knowledge of internal implementation
 */

import request from 'supertest';
import express from 'express';
import dotenv from 'dotenv';
import authRoutes from '../../routes/auth.js';

// Load environment variables for JWT_SECRET
dotenv.config();

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication Module - Black Box Tests', () => {
  let testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'testpassword123',
    name: 'Test User'
  };

  describe('POST /api/auth/register', () => {
    // Test: Verify successful user registration with valid credentials
    // Expected: Returns 201 status, JWT token, and user object (without password)
    test('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.user).not.toHaveProperty('password');
    });

    // Test: Verify email validation rejects invalid email formats
    // Expected: Returns 400 status with validation errors
    test('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    // Test: Verify password length validation (minimum 6 characters)
    // Expected: Returns 400 status with validation errors
    test('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...testUser,
          password: '12345'
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    // Test: Verify required field validation for user name
    // Expected: Returns 400 status with validation errors
    test('should reject registration with missing name', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    // Test: Verify duplicate email prevention - same email cannot register twice
    // Expected: First registration succeeds, second returns 400 with error message
    test('should reject duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register user before each login test
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
    });

    // Test: Verify successful login with valid email and password
    // Expected: Returns 200 status, JWT token, and user object
    test('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });

    // Test: Verify authentication fails with wrong password
    // Expected: Returns 401 status with "Invalid credentials" error
    test('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid credentials');
    });

    // Test: Verify authentication fails for unregistered email addresses
    // Expected: Returns 401 status with error message
    test('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify email format validation on login endpoint
    // Expected: Returns 400 status with validation errors
    test('should reject login with invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: testUser.password
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeEach(async () => {
      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(testUser);
      
      // Then login to get a valid token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      authToken = loginResponse.body.token;
    });

    // Test: Verify authenticated user can retrieve their own profile information
    // Expected: Returns 200 status with user object (email, name, id)
    test('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
    });

    // Test: Verify authentication middleware requires valid JWT token
    // Expected: Returns 401 status when Authorization header is missing
    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify JWT token validation rejects malformed or expired tokens
    // Expected: Returns 401 status when token is invalid
    test('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});

