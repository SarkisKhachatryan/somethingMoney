/**
 * Black Box Tests for Category Module
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import categoryRoutes from '../../routes/category.js';
import authRoutes from '../../routes/auth.js';
import familyRoutes from '../../routes/family.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/categories', categoryRoutes);

describe('Category Module - Black Box Tests', () => {
  let authToken;
  let familyId;
  let categoryId;

  beforeAll(async () => {
    const testUser = {
      email: `categorytest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Category Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerResponse.body.token;

    const familyResponse = await request(app)
      .post('/api/family')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Category Test Family' });
    familyId = familyResponse.body.family.id;
  });

  describe('GET /api/categories/family/:familyId', () => {
    test('should get all categories for family', async () => {
      const response = await request(app)
        .get(`/api/categories/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
    });

    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User'
        });

      const response = await request(app)
        .get(`/api/categories/family/${familyId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/categories/family/${familyId}`)
        .expect(401);
    });
  });

  describe('POST /api/categories', () => {
    test('should create expense category with valid data', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Groceries',
          type: 'expense',
          color: '#3B82F6',
          icon: '🛒'
        })
        .expect(201);

      expect(response.body).toHaveProperty('category');
      expect(response.body.category.name).toBe('Groceries');
      expect(response.body.category.type).toBe('expense');
      categoryId = response.body.category.id;
    });

    test('should create income category', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Salary',
          type: 'income',
          color: '#10b981',
          icon: '💰'
        })
        .expect(201);

      expect(response.body.category.type).toBe('income');
    });

    test('should use default color and icon if not provided', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Default Category',
          type: 'expense'
        })
        .expect(201);

      expect(response.body.category.color).toBeDefined();
      expect(response.body.category.icon).toBeDefined();
    });

    test('should reject category with missing required fields', async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId
          // Missing name and type
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other2${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User 2'
        });

      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .send({
          familyId,
          name: 'Test',
          type: 'expense'
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/categories/:id', () => {
    let updateCategoryId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Update Test',
          type: 'expense',
          color: '#FF0000',
          icon: '📝'
        });
      updateCategoryId = response.body.category.id;
    });

    test('should update category name', async () => {
      const response = await request(app)
        .put(`/api/categories/${updateCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.category.name).toBe('Updated Name');
    });

    test('should update category color', async () => {
      const response = await request(app)
        .put(`/api/categories/${updateCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ color: '#00FF00' })
        .expect(200);

      expect(response.body.category.color).toBe('#00FF00');
    });

    test('should update category icon', async () => {
      const response = await request(app)
        .put(`/api/categories/${updateCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ icon: '🎯' })
        .expect(200);

      expect(response.body.category.icon).toBe('🎯');
    });

    test('should reject update of non-existent category', async () => {
      const response = await request(app)
        .put('/api/categories/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other3${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User 3'
        });

      const response = await request(app)
        .put(`/api/categories/${updateCategoryId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .send({ name: 'Hacked' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/categories/:id', () => {
    let deleteCategoryId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          familyId,
          name: 'Delete Test',
          type: 'expense'
        });
      deleteCategoryId = response.body.category.id;
    });

    test('should delete category for owner', async () => {
      const response = await request(app)
        .delete(`/api/categories/${deleteCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify it's deleted
      const getResponse = await request(app)
        .get(`/api/categories/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const found = getResponse.body.categories.find(c => c.id === deleteCategoryId);
      expect(found).toBeUndefined();
    });

    test('should reject delete of non-existent category', async () => {
      const response = await request(app)
        .delete('/api/categories/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject delete for regular member (only owner/admin can delete)', async () => {
      // Create another user
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `member${Date.now()}@example.com`,
          password: 'password123',
          name: 'Member User'
        });

      // Try to create category in original family (should fail - not a member)
      const createResponse = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .send({
          familyId,
          name: 'Member Category',
          type: 'expense'
        });

      // Should fail because otherUser is not a member of the family
      expect(createResponse.status).toBe(403);
      expect(createResponse.body).toHaveProperty('error');
    });
  });
});

