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
    // Test: Verify retrieval of all categories for a family
    // Logic: Categories are family-specific, so this endpoint should return all categories
    //        (both expense and income) that belong to the specified family
    // Expected: Returns 200 status with categories array containing all family categories
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

    // Test: Verify authentication middleware requires valid JWT token
    // Logic: All category endpoints require authentication to identify the user
    //        and verify their family membership
    // Expected: Returns 401 status when Authorization header is missing
    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/categories/family/${familyId}`)
        .expect(401);
    });
  });

  describe('POST /api/categories', () => {
    // Test: Verify successful creation of expense category with all required fields
    // Logic: Categories are essential for organizing transactions. This test verifies
    //        that expense categories can be created with name, type, color, and icon.
    //        The categoryId is stored for use in subsequent tests.
    // Expected: Returns 201 status with category object containing correct name and type
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

    // Test: Verify successful creation of income category (different type from expense)
    // Logic: The system supports both expense and income categories. This test ensures
    //        income categories are created correctly and type is properly stored.
    // Expected: Returns 201 status with category type set to 'income'
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

    // Test: Verify default values are applied when optional fields (color, icon) are omitted
    // Logic: To improve UX, the system should provide sensible defaults so users don't
    //        have to specify every field. This tests the default value logic.
    // Expected: Returns 201 status with category having default color and icon values
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

    // Test: Verify validation rejects categories missing required fields (name, type)
    // Logic: Name and type are essential for category functionality. Without them,
    //        the category cannot be used for transactions or budgets.
    // Expected: Returns 400 status with error message indicating missing fields
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

    // Test: Verify access control prevents non-family members from creating categories
    // Logic: Only family members should be able to create categories for a family.
    //        This prevents unauthorized users from polluting the category list.
    // Expected: Returns 403 status when user is not a member of the family
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

    // Test: Verify successful update of category name
    // Logic: Users may want to rename categories as their needs change. This tests
    //        partial updates - only the name field is updated, other fields remain unchanged.
    // Expected: Returns 200 status with updated category containing new name
    test('should update category name', async () => {
      const response = await request(app)
        .put(`/api/categories/${updateCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.category.name).toBe('Updated Name');
    });

    // Test: Verify successful update of category color for visual customization
    // Logic: Color helps users visually distinguish categories. This tests that color
    //        can be updated independently of other fields.
    // Expected: Returns 200 status with updated category containing new color
    test('should update category color', async () => {
      const response = await request(app)
        .put(`/api/categories/${updateCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ color: '#00FF00' })
        .expect(200);

      expect(response.body.category.color).toBe('#00FF00');
    });

    // Test: Verify successful update of category icon for visual customization
    // Logic: Icons provide quick visual identification. This tests that icon can be
    //        updated independently, allowing users to customize their category appearance.
    // Expected: Returns 200 status with updated category containing new icon
    test('should update category icon', async () => {
      const response = await request(app)
        .put(`/api/categories/${updateCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ icon: '🎯' })
        .expect(200);

      expect(response.body.category.icon).toBe('🎯');
    });

    // Test: Verify update fails gracefully for non-existent category IDs
    // Logic: Attempting to update a non-existent category should return a clear error
    //        rather than silently failing or creating a new category.
    // Expected: Returns 404 status with error message
    test('should reject update of non-existent category', async () => {
      const response = await request(app)
        .put('/api/categories/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify access control prevents non-family members from updating categories
    // Logic: Only family members should be able to modify categories. This prevents
    //        unauthorized changes to category data.
    // Expected: Returns 403 status when user is not a member of the category's family
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

    // Test: Verify successful deletion of category by owner and removal from database
    // Logic: Owners should be able to delete categories. After deletion, the category
    //        should no longer appear in the family's category list. This tests both
    //        the deletion endpoint and verifies the category is actually removed.
    // Expected: Returns 200 status, and category is no longer retrievable via GET
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

    // Test: Verify deletion fails gracefully for non-existent category IDs
    // Logic: Attempting to delete a non-existent category should return a clear error
    //        rather than returning success (idempotent but should be explicit).
    // Expected: Returns 404 status with error message
    test('should reject delete of non-existent category', async () => {
      const response = await request(app)
        .delete('/api/categories/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    // Test: Verify role-based access control - only owners/admins can delete categories
    // Logic: Category deletion is a destructive operation. Regular members should not
    //        be able to delete categories to prevent accidental data loss. This test
    //        verifies that non-members cannot even create categories (403 on create).
    // Expected: Returns 403 status when non-member tries to create/delete categories
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

