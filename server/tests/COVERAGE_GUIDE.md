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

### Overall Coverage
- **Statements**: ~45%
- **Branches**: ~47%
- **Functions**: ~42%
- **Lines**: ~45%

### Coverage by Module

#### Well Covered (80%+)
- ✅ `middleware/auth.js` - 90%
- ✅ `routes/auth.js` - 89%
- ✅ `routes/transaction.js` - 83%
- ✅ `routes/goal.js` - 80%
- ✅ `routes/dashboard.js` - 86%

#### Partially Covered (50-80%)
- ⚠️ `routes/budget.js` - 77%
- ⚠️ `routes/family.js` - 70%
- ⚠️ `routes/recurring.js` - 63%

#### Needs Coverage (0-50%)
- ❌ `routes/currency.js` - 0%
- ❌ `routes/export.js` - 0%
- ❌ `routes/notification.js` - 0%
- ❌ `routes/category.js` - 26%
- ❌ `services/exchangeRate.js` - 0%
- ❌ `services/exportService.js` - 0%
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

1. **Routes with 0% coverage** (High Priority)
   - `routes/currency.js` - Currency operations
   - `routes/export.js` - Data export
   - `routes/notification.js` - Notifications

2. **Services with 0% coverage** (High Priority)
   - `services/exchangeRate.js` - Exchange rate API
   - `services/exportService.js` - PDF/CSV generation

3. **Low coverage routes** (Medium Priority)
   - `routes/category.js` - Category management (26%)

### Adding Tests

To improve coverage, add tests for uncovered routes and services:

```bash
# Example: Add tests for currency routes
touch tests/blackbox/currency.test.js

# Example: Add tests for export routes
touch tests/blackbox/export.test.js
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

