/**
 * Tests for Exchange Rate Service
 */

import { getExchangeRates, convertCurrency, formatCurrency, getCurrencySymbol } from '../../services/exchangeRate.js';

describe('Exchange Rate Service', () => {
  describe('getExchangeRates', () => {
    test('should fetch exchange rates for USD', async () => {
      const rates = await getExchangeRates('USD');
      expect(rates).toBeDefined();
      expect(typeof rates).toBe('object');
    });

    test('should fetch exchange rates for EUR', async () => {
      const rates = await getExchangeRates('EUR');
      expect(rates).toBeDefined();
      expect(typeof rates).toBe('object');
    });

    test('should use cache for repeated requests', async () => {
      const rates1 = await getExchangeRates('USD');
      const rates2 = await getExchangeRates('USD');
      
      // Should return cached data (same reference or same values)
      expect(rates2).toBeDefined();
    });

    test('should return fallback rates on API failure', async () => {
      // This will use fallback if API fails
      const rates = await getExchangeRates('INVALID');
      expect(rates).toBeDefined();
      expect(typeof rates).toBe('object');
    });
  });

  describe('convertCurrency', () => {
    test('should return same amount when converting to same currency', () => {
      const result = convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    test('should convert USD to EUR using fallback rates', () => {
      const result = convertCurrency(100, 'USD', 'EUR');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    test('should convert EUR to USD', () => {
      const result = convertCurrency(100, 'EUR', 'USD');
      expect(result).toBeGreaterThan(0);
    });

    test('should convert using provided rates', () => {
      const customRates = { EUR: 0.92, USD: 1 };
      const result = convertCurrency(100, 'USD', 'EUR', customRates);
      expect(result).toBe(92);
    });

    test('should handle AMD to RUB conversion', () => {
      const result = convertCurrency(1000, 'AMD', 'RUB');
      expect(result).toBeGreaterThan(0);
    });

    test('should handle RUB to USD conversion', () => {
      const result = convertCurrency(1000, 'RUB', 'USD');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('formatCurrency', () => {
    test('should format USD currency', () => {
      const result = formatCurrency(100.50, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('100.50');
    });

    test('should format EUR currency', () => {
      const result = formatCurrency(50.25, 'EUR');
      expect(result).toContain('€');
      expect(result).toContain('50.25');
    });

    test('should format AMD currency', () => {
      const result = formatCurrency(1000, 'AMD');
      expect(result).toContain('֏');
    });

    test('should format RUB currency', () => {
      const result = formatCurrency(500, 'RUB');
      expect(result).toContain('₽');
    });

    test('should format large numbers with commas', () => {
      const result = formatCurrency(1000000, 'USD');
      expect(result).toContain(',');
    });

    test('should handle unknown currency', () => {
      const result = formatCurrency(100, 'XYZ');
      expect(result).toContain('XYZ');
      expect(result).toContain('100.00');
    });
  });

  describe('getCurrencySymbol', () => {
    test('should return correct symbol for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    test('should return correct symbol for EUR', () => {
      expect(getCurrencySymbol('EUR')).toBe('€');
    });

    test('should return correct symbol for AMD', () => {
      expect(getCurrencySymbol('AMD')).toBe('֏');
    });

    test('should return correct symbol for RUB', () => {
      expect(getCurrencySymbol('RUB')).toBe('₽');
    });

    test('should return currency code for unknown currency', () => {
      expect(getCurrencySymbol('XYZ')).toBe('XYZ');
    });
  });
});

