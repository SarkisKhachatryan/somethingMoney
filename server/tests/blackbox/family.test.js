/**
 * Black Box Tests for Family Module
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import familyRoutes from '../../routes/family.js';
import authRoutes from '../../routes/auth.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/family', familyRoutes);

describe('Family Module - Black Box Tests', () => {
  let authToken;
  let userId;
  let familyId;

  beforeAll(async () => {
    const testUser = {
      email: `familytest${Date.now()}@example.com`,
      password: 'testpassword123',
      name: 'Family Test User'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;
  });

  describe('POST /api/family', () => {
    // Test: Verify successful creation of family with valid name
    // Logic: Creating a family should create the family record and automatically
    //        add the creator as owner. The family should be returned with its ID.
    // Expected: Returns 201 status with family object containing name and currency
    test('should create family with valid name', async () => {
      const response = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Family' })
        .expect(201);

      expect(response.body).toHaveProperty('family');
      expect(response.body.family.name).toBe('Test Family');
      expect(response.body.family.currency).toBe('USD'); // Default currency
      familyId = response.body.family.id;
    });

    // Test: Verify family creation with specified currency
    // Logic: Users can specify a currency when creating a family. The currency
    //        should be validated against supported currencies and stored.
    // Expected: Returns 201 status with family having the specified currency
    test('should create family with specified currency', async () => {
      const response = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'EUR Family', currency: 'EUR' })
        .expect(201);

      expect(response.body.family.currency).toBe('EUR');
    });

    // Test: Verify invalid currency defaults to USD
    // Logic: If an invalid currency is provided, the system should default to USD
    //        rather than failing. This provides resilience.
    // Expected: Returns 201 status with currency set to USD
    test('should default to USD for invalid currency', async () => {
      const response = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Invalid Currency Family', currency: 'INVALID' })
        .expect(201);

      expect(response.body.family.currency).toBe('USD');
    });

    // Test: Verify validation rejects family creation without name
    // Logic: Family name is required. Without it, the family cannot be identified.
    // Expected: Returns 400 status with error message
    test('should reject family creation without name', async () => {
      const response = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('name');
    });

    // Test: Verify creator is automatically added as owner
    // Logic: When a user creates a family, they should automatically become
    //        the owner with full permissions. This is tested by checking
    //        family details after creation.
    // Expected: Creator appears as owner in family members list
    test('should add creator as owner automatically', async () => {
      const createResponse = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Owner Test Family' });

      const familyId = createResponse.body.family.id;

      const getResponse = await request(app)
        .get(`/api/family/${familyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const owner = getResponse.body.members.find(m => m.id === userId);
      expect(owner).toBeDefined();
      expect(owner.role).toBe('owner');
    });
  });

  describe('GET /api/family', () => {
    // Test: Verify retrieval of all families for the authenticated user
    // Logic: Users should see all families they are members of, regardless of role.
    //        The response should include family details and the user's role in each.
    // Expected: Returns 200 status with array of families including user's role
    test('should get all families for user', async () => {
      const response = await request(app)
        .get('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('families');
      expect(Array.isArray(response.body.families)).toBe(true);
      expect(response.body.families.length).toBeGreaterThan(0);
      expect(response.body.families[0]).toHaveProperty('role');
    });

    // Test: Verify authentication is required to view families
    // Logic: Family data is sensitive. Only authenticated users should access it.
    // Expected: Returns 401 status when Authorization header is missing
    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/family')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/family/:id', () => {
    let testFamilyId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Details Test Family' });
      testFamilyId = response.body.family.id;
    });

    // Test: Verify retrieval of family details including members list
    // Logic: Family details should include family info, all members with their roles,
    //        and the current user's role. This is used for the Settings page.
    // Expected: Returns 200 status with family, members array, and userRole
    test('should get family details with members', async () => {
      const response = await request(app)
        .get(`/api/family/${testFamilyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('family');
      expect(response.body).toHaveProperty('members');
      expect(response.body).toHaveProperty('userRole');
      expect(Array.isArray(response.body.members)).toBe(true);
      expect(response.body.members.length).toBeGreaterThan(0);
    });

    // Test: Verify access control - only family members can view family details
    // Logic: Family details include member information which is sensitive.
    //        Only members should be able to view this data.
    // Expected: Returns 403 status when user is not a member of the family
    test('should reject access for non-family member', async () => {
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `other${Date.now()}@example.com`,
          password: 'password123',
          name: 'Other User'
        });

      const response = await request(app)
        .get(`/api/family/${testFamilyId}`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/family/:id/currency', () => {
    let testFamilyId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Currency Test Family', currency: 'USD' });
      testFamilyId = response.body.family.id;
    });

    // Test: Verify successful update of family currency by owner
    // Logic: Owners and admins should be able to change the family's base currency.
    //        This affects how all amounts are displayed throughout the app.
    // Expected: Returns 200 status with updated family containing new currency
    test('should update family currency as owner', async () => {
      const response = await request(app)
        .put(`/api/family/${testFamilyId}/currency`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currency: 'EUR' })
        .expect(200);

      expect(response.body.family.currency).toBe('EUR');
    });

    // Test: Verify validation rejects invalid currency codes
    // Logic: Only supported currencies (USD, EUR, AMD, RUB) should be accepted.
    //        Invalid currencies should return a validation error.
    // Expected: Returns 400 status with error message
    test('should reject invalid currency', async () => {
      const response = await request(app)
        .put(`/api/family/${testFamilyId}/currency`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currency: 'INVALID' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid currency');
    });

    // Test: Verify role-based access - only owners/admins can change currency
    // Logic: Changing currency is a significant change that affects all family data.
    //        Regular members should not be able to change it.
    // Expected: Returns 403 status when regular member tries to change currency
    test('should reject currency update for regular member', async () => {
      // Create another user
      const otherUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `member${Date.now()}@example.com`,
          password: 'password123',
          name: 'Member User'
        });

      // Add as member (not owner/admin)
      await request(app)
        .post(`/api/family/${testFamilyId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: otherUser.body.user.email, role: 'member' });

      // Try to change currency as member
      const response = await request(app)
        .put(`/api/family/${testFamilyId}/currency`)
        .set('Authorization', `Bearer ${otherUser.body.token}`)
        .send({ currency: 'EUR' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('owners and admins');
    });
  });

  describe('POST /api/family/:id/members', () => {
    let testFamilyId;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Members Test Family' });
      testFamilyId = response.body.family.id;
    });

    // Test: Verify successful addition of family member by email
    // Logic: Owners and admins can add members by email. The system should find
    //        the user by email and add them to the family with the specified role.
    // Expected: Returns 201 status with success message
    test('should add member to family by email', async () => {
      const newUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `newmember${Date.now()}@example.com`,
          password: 'password123',
          name: 'New Member'
        });

      const response = await request(app)
        .post(`/api/family/${testFamilyId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: newUser.body.user.email, role: 'member' })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('successfully');
    });

    // Test: Verify member is added with specified role
    // Logic: When adding a member, the role should be specified (defaults to 'member').
    //        The role determines their permissions in the family.
    // Expected: Member appears in family with correct role
    test('should add member with specified role', async () => {
      const newUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `admin${Date.now()}@example.com`,
          password: 'password123',
          name: 'Admin User'
        });

      await request(app)
        .post(`/api/family/${testFamilyId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: newUser.body.user.email, role: 'admin' })
        .expect(201);

      const getResponse = await request(app)
        .get(`/api/family/${testFamilyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const admin = getResponse.body.members.find(m => m.email === newUser.body.user.email);
      expect(admin).toBeDefined();
      expect(admin.role).toBe('admin');
    });

    // Test: Verify default role is 'member' when not specified
    // Logic: If no role is provided, the system should default to 'member' role.
    //        This is the safest default for new members.
    // Expected: Member is added with 'member' role
    test('should default to member role when not specified', async () => {
      const newUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `defaultrole${Date.now()}@example.com`,
          password: 'password123',
          name: 'Default Role User'
        });

      await request(app)
        .post(`/api/family/${testFamilyId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: newUser.body.user.email })
        .expect(201);

      const getResponse = await request(app)
        .get(`/api/family/${testFamilyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      const member = getResponse.body.members.find(m => m.email === newUser.body.user.email);
      expect(member.role).toBe('member');
    });

    // Test: Verify error when user not found by email
    // Logic: If the email doesn't match any registered user, the system should
    //        return a clear error rather than silently failing.
    // Expected: Returns 404 status with error message
    test('should reject adding non-existent user', async () => {
      const response = await request(app)
        .post(`/api/family/${testFamilyId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });

    // Test: Verify error when user is already a member
    // Logic: A user cannot be added to a family twice. The system should detect
    //        existing membership and return an appropriate error.
    // Expected: Returns 400 status with error message
    test('should reject adding existing member', async () => {
      const newUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `existing${Date.now()}@example.com`,
          password: 'password123',
          name: 'Existing User'
        });

      // Add first time
      await request(app)
        .post(`/api/family/${testFamilyId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: newUser.body.user.email })
        .expect(201);

      // Try to add again
      const response = await request(app)
        .post(`/api/family/${testFamilyId}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: newUser.body.user.email })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already a member');
    });

    // Test: Verify role-based access - only owners/admins can add members
    // Logic: Adding members is a permission-sensitive operation. Only owners
    //        and admins should be able to add new members to the family.
    // Expected: Returns 403 status when regular member tries to add members
    test('should reject member addition by regular member', async () => {
      const owner = await request(app)
        .post('/api/auth/register')
        .send({
          email: `owner${Date.now()}@example.com`,
          password: 'password123',
          name: 'Owner User'
        });

      const member = await request(app)
        .post('/api/auth/register')
        .send({
          email: `regular${Date.now()}@example.com`,
          password: 'password123',
          name: 'Regular Member'
        });

      // Create family as owner
      const familyResponse = await request(app)
        .post('/api/family')
        .set('Authorization', `Bearer ${owner.body.token}`)
        .send({ name: 'Access Test Family' });
      const familyId = familyResponse.body.family.id;

      // Add member
      await request(app)
        .post(`/api/family/${familyId}/members`)
        .set('Authorization', `Bearer ${owner.body.token}`)
        .send({ email: member.body.user.email, role: 'member' })
        .expect(201);

      // Try to add another member as regular member
      const newUser = await request(app)
        .post('/api/auth/register')
        .send({
          email: `newuser${Date.now()}@example.com`,
          password: 'password123',
          name: 'New User'
        });

      const response = await request(app)
        .post(`/api/family/${familyId}/members`)
        .set('Authorization', `Bearer ${member.body.token}`)
        .send({ email: newUser.body.user.email })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('owners and admins');
    });
  });
});

