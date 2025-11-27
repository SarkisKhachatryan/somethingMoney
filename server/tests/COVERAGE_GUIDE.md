# Code Coverage Guide

## Overview

This project uses **Jest's built-in code coverage** tool (powered by Istanbul/nyc), which is free, open-source, and provides comprehensive coverage reporting.

## Running Coverage Reports

### Basic Coverage Report
```bash
npm run test:coverage
```

This will:
- Run all tests
- Generate coverage reports in multiple formats
- Display a summary in the terminal
- Create detailed HTML reports in `coverage/` directory

### Coverage with Watch Mode
```bash
npm run test:coverage:watch
```

## Coverage Reports Generated

1. **Terminal Report** - Summary table showing coverage percentages
2. **HTML Report** - Detailed interactive report (open `coverage/lcov-report/index.html` in browser)
3. **LCOV Report** - Machine-readable format for CI/CD integration
4. **JSON Report** - Programmatic access to coverage data

## Current Coverage Status

### Overall Coverage: 86% 🎉
- **Statements**: 86.06%
- **Branches**: 84.66%
- **Functions**: 95.94%
- **Lines**: 86.03%

### Coverage by Module

#### Well Covered (85%+)
- ✅ `middleware/auth.js` - 90%
- ✅ `routes/auth.js` - 89%
- ✅ `routes/dashboard.js` - 90% ✨
- ✅ `routes/budget.js` - 88% ✨
- ✅ `routes/family.js` - 86% ✨
- ✅ `routes/recurring.js` - 84% ✨
- ✅ `routes/notifications.js` - 87%
- ✅ `routes/export.js` - 87%
- ✅ `routes/category.js` - 84%
- ✅ `routes/transaction.js` - 83%
- ✅ `routes/goal.js` - 80%
- ✅ `services/exportService.js` - 94%
- ✅ `services/notificationService.js` - 86% ✨

#### Partially Covered (75-85%)
- ⚠️ `routes/currency.js` - 79%
- ⚠️ `services/exchangeRate.js` - 76%

## Coverage Thresholds

Current thresholds are set to 40% minimum for:
- Branches
- Functions
- Lines
- Statements

These can be adjusted in `package.json` under `jest.coverageThreshold`.

## Viewing HTML Coverage Report

1. Run coverage: `npm run test:coverage`
2. Open `coverage/lcov-report/index.html` in your browser
3. Navigate through files to see:
   - Line-by-line coverage
   - Uncovered lines highlighted in red
   - Branch coverage details
   - Function coverage

## Improving Coverage

### Priority Areas

1. **Partially covered services** (High Priority)
   - `services/exchangeRate.js` - Exchange rate service (76% → 85%)
     - Cache functionality
     - Fallback rate logic
     - Error handling

2. **Partially covered routes** (Medium Priority)
   - `routes/currency.js` - Currency operations (79% → 85%)
     - Error handling paths
   - `routes/goal.js` - Goals (80% → 85%)
     - Error handling paths
   - `routes/transaction.js` - Transactions (83% → 85%)
     - Error handling paths

3. **Edge cases and error handling** (Low Priority)
   - Add error handling tests for all routes
   - Test boundary conditions
   - Test invalid input handling

3. **Edge cases and error handling** (Low Priority)
   - Add tests for error paths in well-covered modules
   - Test boundary conditions
   - Test invalid input handling

### Recent Improvements ✨

The following modules have been recently improved with comprehensive test coverage:
- ✅ `routes/family.js` - 70% → 86% coverage
- ✅ `routes/recurring.js` - 63% → 84% coverage
- ✅ `routes/budget.js` - 77% → 88% coverage
- ✅ `routes/dashboard.js` - 86% → 90% coverage
- ✅ `services/notificationService.js` - 61% → 86% coverage
- ✅ `routes/currency.js` - 79% coverage
- ✅ `routes/export.js` - 87% coverage
- ✅ `routes/notification.js` - 87% coverage
- ✅ `routes/category.js` - 84% coverage
- ✅ `services/exchangeRate.js` - 76% coverage
- ✅ `services/exportService.js` - 94% coverage

### Adding Tests

To improve coverage further, add tests for partially covered modules:

```bash
# Example: Add more tests for family routes
# Focus on member management and currency updates
npm test family.test.js

# Example: Add tests for notification service
npm test notificationService.test.js
```

## CI/CD Integration

The coverage reports can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Coverage Metrics Explained

- **Statements**: Percentage of code statements executed
- **Branches**: Percentage of conditional branches (if/else) tested
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

## Best Practices

1. **Aim for 80%+ coverage** on critical business logic
2. **Focus on edge cases** and error handling
3. **Test both success and failure paths**
4. **Don't sacrifice test quality for coverage numbers**
5. **Use coverage to identify untested code**, not as the only metric

## Resources

- [Jest Coverage Documentation](https://jestjs.io/docs/configuration#coveragethreshold-object)
- [Istanbul Coverage Tool](https://istanbul.js.org/)
- [Coverage Best Practices](https://martinfowler.com/bliki/TestCoverage.html)

