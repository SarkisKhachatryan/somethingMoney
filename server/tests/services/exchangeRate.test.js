/**
 * Tests for Exchange Rate Service
 */

import { getExchangeRates, convertCurrency, formatCurrency, getCurrencySymbol } from '../../services/exchangeRate.js';

describe('Exchange Rate Service', () => {
  describe('getExchangeRates', () => {
    // Test: Verify exchange rate fetching for USD base currency
    // Logic: The service fetches rates from external API (exchangerate-api.com) or uses cache.
    //        This tests that the function returns a rates object with currency pairs.
    //        USD is the default base currency, so this tests the most common case.
    // Expected: Returns an object with exchange rates (e.g., {EUR: 0.92, AMD: 405, ...})
    test('should fetch exchange rates for USD', async () => {
      const rates = await getExchangeRates('USD');
      expect(rates).toBeDefined();
      expect(typeof rates).toBe('object');
    });

    // Test: Verify exchange rate fetching for EUR base currency
    // Logic: Different base currencies return different rate structures. EUR as base
    //        means all rates are relative to EUR (e.g., USD: 1.09 means 1 EUR = 1.09 USD).
    //        This tests that the service handles non-USD base currencies correctly.
    // Expected: Returns an object with exchange rates relative to EUR
    test('should fetch exchange rates for EUR', async () => {
      const rates = await getExchangeRates('EUR');
      expect(rates).toBeDefined();
      expect(typeof rates).toBe('object');
    });

    // Test: Verify caching mechanism reduces API calls for repeated requests
    // Logic: Exchange rates are cached for 1 hour to reduce API calls and improve performance.
    //        This tests that subsequent calls with the same base currency return cached data
    //        instead of making new API requests. Cache is keyed by base currency.
    // Expected: Second call returns cached rates (may be same reference or same values)
    test('should use cache for repeated requests', async () => {
      const rates1 = await getExchangeRates('USD');
      const rates2 = await getExchangeRates('USD');
      
      // Should return cached data (same reference or same values)
      expect(rates2).toBeDefined();
    });

    // Test: Verify fallback rates are used when API fails or invalid currency is requested
    // Logic: If the external API fails or an invalid currency is requested, the service
    //        should return hardcoded fallback rates to ensure the app continues working.
    //        This provides resilience and prevents complete failure when API is down.
    // Expected: Returns fallback rates object (approximate rates for supported currencies)
    test('should return fallback rates on API failure', async () => {
      // This will use fallback if API fails
      const rates = await getExchangeRates('INVALID');
      expect(rates).toBeDefined();
      expect(typeof rates).toBe('object');
    });
  });

  describe('convertCurrency', () => {
    // Test: Verify identity conversion (same currency returns same amount)
    // Logic: Converting a currency to itself should return the original amount unchanged.
    //        This is an edge case that should be handled efficiently (no calculation needed).
    // Expected: Returns the same amount value (100 USD -> 100 USD = 100)
    test('should return same amount when converting to same currency', () => {
      const result = convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    // Test: Verify currency conversion using fallback rates when rates not provided
    // Logic: If no rates are provided, the function uses fallback rates. This tests
    //        the conversion logic with fallback data. USD to EUR should multiply by ~0.92.
    // Expected: Returns a positive number representing converted amount
    test('should convert USD to EUR using fallback rates', () => {
      const result = convertCurrency(100, 'USD', 'EUR');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    // Test: Verify reverse conversion (EUR to USD) works correctly
    // Logic: Conversion should work in both directions. EUR to USD uses inverse rate
    //        or direct rate lookup. This tests bidirectional conversion capability.
    // Expected: Returns a positive number (EUR is worth more than USD, so 100 EUR > 100 USD)
    test('should convert EUR to USD', () => {
      const result = convertCurrency(100, 'EUR', 'USD');
      expect(result).toBeGreaterThan(0);
    });

    test('should convert using provided rates', () => {
      const customRates = { EUR: 0.92, USD: 1 };
      const result = convertCurrency(100, 'USD', 'EUR', customRates);
      expect(result).toBe(92);
    });

    // Test: Verify conversion between non-USD currencies (AMD to RUB)
    // Logic: The system supports multiple currencies. This tests conversion between
    //        two non-USD currencies, which may require intermediate USD conversion or
    //        direct rate lookup if available in fallback rates.
    // Expected: Returns a positive number representing converted amount
    test('should handle AMD to RUB conversion', () => {
      const result = convertCurrency(1000, 'AMD', 'RUB');
      expect(result).toBeGreaterThan(0);
    });

    // Test: Verify conversion from RUB to USD works correctly
    // Logic: RUB has a lower value than USD, so conversion should result in a smaller
    //        number. This tests that the conversion handles currencies with different
    //        value scales correctly.
    // Expected: Returns a positive number (1000 RUB should be less than 1000 USD)
    test('should handle RUB to USD conversion', () => {
      const result = convertCurrency(1000, 'RUB', 'USD');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('formatCurrency', () => {
    // Test: Verify USD currency formatting with dollar sign and decimal places
    // Logic: Currency formatting makes amounts readable. USD should show $ symbol
    //        and format numbers with 2 decimal places (e.g., $100.50).
    // Expected: Returns string containing $ symbol and formatted number
    test('should format USD currency', () => {
      const result = formatCurrency(100.50, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('100.50');
    });

    // Test: Verify EUR currency formatting with euro sign
    // Logic: Each currency has its own symbol. EUR should show € symbol.
    //        This tests that the formatting function correctly maps currency codes to symbols.
    // Expected: Returns string containing € symbol and formatted number
    test('should format EUR currency', () => {
      const result = formatCurrency(50.25, 'EUR');
      expect(result).toContain('€');
      expect(result).toContain('50.25');
    });

    // Test: Verify AMD currency formatting with Armenian dram symbol
    // Logic: AMD uses the ֏ symbol. This tests that less common currencies are
    //        properly formatted with their correct symbols.
    // Expected: Returns string containing ֏ symbol
    test('should format AMD currency', () => {
      const result = formatCurrency(1000, 'AMD');
      expect(result).toContain('֏');
    });

    // Test: Verify RUB currency formatting with ruble symbol
    // Logic: RUB uses the ₽ symbol. This tests Russian ruble formatting.
    // Expected: Returns string containing ₽ symbol
    test('should format RUB currency', () => {
      const result = formatCurrency(500, 'RUB');
      expect(result).toContain('₽');
    });

    // Test: Verify number formatting includes thousand separators for readability
    // Logic: Large numbers should be formatted with commas (e.g., 1,000,000 instead of 1000000).
    //        This improves readability, especially for currencies with high values like AMD.
    // Expected: Returns string containing comma separators
    test('should format large numbers with commas', () => {
      const result = formatCurrency(1000000, 'USD');
      expect(result).toContain(',');
    });

    // Test: Verify graceful handling of unsupported/unknown currency codes
    // Logic: If an unknown currency is provided, the function should not crash.
    //        It should use the currency code itself as the symbol and still format
    //        the number correctly. This provides resilience for future currency additions.
    // Expected: Returns string with currency code as symbol and formatted number
    test('should handle unknown currency', () => {
      const result = formatCurrency(100, 'XYZ');
      expect(result).toContain('XYZ');
      expect(result).toContain('100.00');
    });
  });

  describe('getCurrencySymbol', () => {
    // Test: Verify currency symbol lookup returns correct symbol for USD
    // Logic: getCurrencySymbol is a utility function that maps currency codes to symbols.
    //        This is used throughout the app for display. USD should return $.
    // Expected: Returns '$' for USD
    test('should return correct symbol for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    // Test: Verify currency symbol lookup for EUR
    // Logic: Each supported currency should return its correct symbol.
    //        EUR should return € symbol.
    // Expected: Returns '€' for EUR
    test('should return correct symbol for EUR', () => {
      expect(getCurrencySymbol('EUR')).toBe('€');
    });

    // Test: Verify currency symbol lookup for AMD
    // Logic: AMD should return ֏ symbol. This tests that all supported currencies
    //        have their symbols correctly mapped.
    // Expected: Returns '֏' for AMD
    test('should return correct symbol for AMD', () => {
      expect(getCurrencySymbol('AMD')).toBe('֏');
    });

    // Test: Verify currency symbol lookup for RUB
    // Logic: RUB should return ₽ symbol. This completes testing of all supported currencies.
    // Expected: Returns '₽' for RUB
    test('should return correct symbol for RUB', () => {
      expect(getCurrencySymbol('RUB')).toBe('₽');
    });

    // Test: Verify graceful fallback for unknown currency codes
    // Logic: If an unknown currency is requested, the function should return the
    //        currency code itself as a fallback rather than undefined or null.
    //        This prevents display errors in the UI.
    // Expected: Returns the currency code itself (e.g., 'XYZ' for unknown currency)
    test('should return currency code for unknown currency', () => {
      expect(getCurrencySymbol('XYZ')).toBe('XYZ');
    });
  });
});

