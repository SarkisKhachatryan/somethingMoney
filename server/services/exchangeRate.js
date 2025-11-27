import axios from 'axios';

// Free tier: https://www.exchangerate-api.com/
// No API key needed for free tier (up to 1,500 requests/month)
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/';

// Cache exchange rates for 1 hour
let exchangeRateCache = {
  data: null,
  timestamp: null,
  ttl: 60 * 60 * 1000 // 1 hour in milliseconds
};

export async function getExchangeRates(baseCurrency = 'USD') {
  try {
    // Check cache first
    const now = Date.now();
    if (
      exchangeRateCache.data &&
      exchangeRateCache.timestamp &&
      now - exchangeRateCache.timestamp < exchangeRateCache.ttl &&
      exchangeRateCache.baseCurrency === baseCurrency
    ) {
      return exchangeRateCache.data;
    }

    // Fetch from API
    const response = await axios.get(`${EXCHANGE_RATE_API}${baseCurrency}`);
    const rates = response.data.rates;

    // Cache the result
    exchangeRateCache = {
      data: rates,
      timestamp: now,
      baseCurrency: baseCurrency
    };

    return rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return fallback rates if API fails
    return getFallbackRates(baseCurrency);
  }
}

export function convertCurrency(amount, fromCurrency, toCurrency, rates = null) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // If rates not provided, use fallback
  if (!rates) {
    rates = getFallbackRates(fromCurrency);
  }

  // Use fallback rates for conversion
  const fallbackRates = {
    USD: { EUR: 0.92, AMD: 405, RUB: 92 },
    EUR: { USD: 1.09, AMD: 440, RUB: 100 },
    AMD: { USD: 0.0025, EUR: 0.0023, RUB: 0.23 },
    RUB: { USD: 0.011, EUR: 0.01, AMD: 4.4 }
  };

  // Try to use provided rates first, then fallback
  let rate = rates[toCurrency];
  if (!rate && fallbackRates[fromCurrency]) {
    rate = fallbackRates[fromCurrency][toCurrency];
  }
  if (!rate) {
    // If still no rate, try inverse
    if (fallbackRates[toCurrency] && fallbackRates[toCurrency][fromCurrency]) {
      rate = 1 / fallbackRates[toCurrency][fromCurrency];
    } else {
      rate = 1; // Default to 1 if no rate found
    }
  }

  return amount * rate;
}

function getFallbackRates(baseCurrency) {
  // Fallback rates (approximate, should be updated periodically)
  // These are rough estimates - real API should be used
  const fallbackRates = {
    USD: { EUR: 0.92, AMD: 405, RUB: 92 },
    EUR: { USD: 1.09, AMD: 440, RUB: 100 },
    AMD: { USD: 0.0025, EUR: 0.0023, RUB: 0.23 },
    RUB: { USD: 0.011, EUR: 0.01, AMD: 4.4 }
  };

  return fallbackRates[baseCurrency] || {};
}

function getFallbackRate(fromCurrency, toCurrency) {
  const fallbackRates = {
    USD: { EUR: 0.92, AMD: 405, RUB: 92 },
    EUR: { USD: 1.09, AMD: 440, RUB: 100 },
    AMD: { USD: 0.0025, EUR: 0.0023, RUB: 0.23 },
    RUB: { USD: 0.011, EUR: 0.01, AMD: 4.4 }
  };

  if (fromCurrency === toCurrency) return 1;
  return fallbackRates[fromCurrency]?.[toCurrency] || 1;
}

export function formatCurrency(amount, currency) {
  const symbols = {
    USD: '$',
    EUR: '€',
    AMD: '֏',
    RUB: '₽'
  };

  const symbol = symbols[currency] || currency;
  
  // Format number with appropriate decimals
  const formatted = parseFloat(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${symbol}${formatted}`;
}

export function getCurrencySymbol(currency) {
  const symbols = {
    USD: '$',
    EUR: '€',
    AMD: '֏',
    RUB: '₽'
  };
  return symbols[currency] || currency;
}

