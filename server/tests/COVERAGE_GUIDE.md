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

### Overall Coverage: 80% 🎉
- **Statements**: 80%
- **Branches**: 73%
- **Functions**: 93%
- **Lines**: 80%

### Coverage by Module

#### Well Covered (80%+)
- ✅ `middleware/auth.js` - 90%
- ✅ `routes/auth.js` - 89%
- ✅ `routes/transaction.js` - 83%
- ✅ `routes/goal.js` - 80%
- ✅ `routes/dashboard.js` - 86%
- ✅ `routes/category.js` - 84% ✨
- ✅ `routes/currency.js` - 79% ✨
- ✅ `routes/notifications.js` - 87% ✨
- ✅ `routes/export.js` - 87% ✨
- ✅ `services/exportService.js` - 94% ✨

#### Partially Covered (60-80%)
- ⚠️ `routes/budget.js` - 77%
- ⚠️ `routes/family.js` - 70%
- ⚠️ `routes/recurring.js` - 63%
- ⚠️ `services/exchangeRate.js` - 76%
- ⚠️ `services/notificationService.js` - 61%

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

1. **Partially covered routes** (Medium Priority)
   - `routes/family.js` - Family management (70% → 85%)
   - `routes/recurring.js` - Recurring transactions (63% → 80%)
   - `routes/budget.js` - Budget management (77% → 85%)

2. **Partially covered services** (Medium Priority)
   - `services/notificationService.js` - Notification service (61% → 80%)
   - `services/exchangeRate.js` - Exchange rate service (76% → 85%)

3. **Edge cases and error handling** (Low Priority)
   - Add tests for error paths in well-covered modules
   - Test boundary conditions
   - Test invalid input handling

### Recent Improvements ✨

The following modules have been recently added with comprehensive test coverage:
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

