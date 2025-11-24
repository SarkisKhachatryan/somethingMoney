// Currency utility functions for frontend

export const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  AMD: { symbol: '֏', name: 'Armenian Dram' },
  RUB: { symbol: '₽', name: 'Russian Ruble' }
};

export function formatCurrency(amount, currency = 'USD') {
  const currencyInfo = CURRENCIES[currency] || CURRENCIES.USD;
  const symbol = currencyInfo.symbol;
  
  // Format number with appropriate decimals
  const formatted = parseFloat(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${symbol}${formatted}`;
}

export function getCurrencySymbol(currency = 'USD') {
  return CURRENCIES[currency]?.symbol || '$';
}

export function getCurrencyName(currency = 'USD') {
  return CURRENCIES[currency]?.name || 'US Dollar';
}

