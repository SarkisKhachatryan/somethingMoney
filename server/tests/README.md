# Test Suite Documentation

This directory contains comprehensive test suites for the Family Budget Tracker application.

## Test Structure

### Black Box Tests (`/blackbox/`)
These tests verify API endpoints and module functionality without knowledge of internal implementation. They test:
- Input validation
- Error handling
- Authentication and authorization
- Data integrity
- API contract compliance

**Files:**
- `auth.test.js` - Authentication module tests
- `transactions.test.js` - Transaction management tests
- `budgets.test.js` - Budget management tests
- `recurring.test.js` - Recurring transactions tests
- `goals.test.js` - Financial goals tests
- `currency.test.js` - Multi-currency support tests
- `notifications.test.js` - Notification system tests
- `export.test.js` - Data export tests

### Real-World Scenarios (`/scenarios/`)
These tests simulate actual user workflows and real-world use cases:

**Files:**
- `real-world.test.js` - Complete family budget setup and management scenarios
- `budget-management.test.js` - Budget planning and tracking scenarios
- `recurring-bills.test.js` - Recurring bill management scenarios
- `multi-user.test.js` - Family collaboration scenarios
- `financial-goals.test.js` - Goal setting and achievement scenarios

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test auth.test.js

# Run tests with coverage
npm test -- --coverage
```

## Test Scenarios Covered

### Black Box Tests

#### Authentication
- ✅ User registration with valid/invalid data
- ✅ Login with correct/incorrect credentials
- ✅ Token validation
- ✅ Password requirements
- ✅ Email validation

#### Transactions
- ✅ Create expense/income transactions
- ✅ Retrieve transactions with filters
- ✅ Update transaction details
- ✅ Delete transactions
- ✅ Category type validation
- ✅ Access control (family members only)

#### Budgets
- ✅ Create monthly budgets
- ✅ Update budgets
- ✅ Delete budgets
- ✅ Budget retrieval by month/year
- ✅ Budget validation

#### Recurring Transactions
- ✅ Create recurring transactions (daily, weekly, monthly, yearly)
- ✅ Process due recurring transactions
- ✅ Pause/resume recurring transactions
- ✅ Update recurring transaction details
- ✅ Delete recurring transactions

### Real-World Scenarios

#### Scenario 1: New Family Setup
- Family registration
- Category creation
- Initial budget setup
- First transactions

#### Scenario 2: Monthly Expense Tracking
- Daily expense logging
- Budget monitoring
- Spending analysis
- Budget adjustments

#### Scenario 3: Recurring Bills Management
- Setting up monthly bills
- Processing recurring transactions
- Pausing subscriptions
- Managing bill reminders

#### Scenario 4: Family Collaboration
- Multiple users adding transactions
- Shared budget visibility
- Role-based access
- Family member management

#### Scenario 5: Budget Overspending
- Detecting budget overruns
- Budget alerts
- Spending analysis
- Budget adjustments

#### Scenario 6: Financial Goals
- Creating savings goals
- Tracking progress
- Goal milestones
- Goal completion

#### Scenario 7: Multi-Currency Usage
- Currency switching
- Exchange rate handling
- Currency formatting
- Cross-currency transactions

#### Scenario 8: Monthly Review
- End-of-month analysis
- Budget adjustments
- Spending patterns
- Next month planning

## Test Data

Tests use isolated test data:
- Unique email addresses (timestamp-based)
- Separate test families
- Test categories and transactions
- Cleanup after tests

## Best Practices

1. **Isolation**: Each test is independent
2. **Cleanup**: Test data is cleaned up after tests
3. **Realistic Data**: Tests use realistic amounts and dates
4. **Error Cases**: Both success and failure paths are tested
5. **Edge Cases**: Boundary conditions and edge cases are covered

## Coverage Goals

- API endpoints: 100%
- Core business logic: 90%+
- Error handling: 100%
- User workflows: 80%+

