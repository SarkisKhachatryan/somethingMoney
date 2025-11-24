import { useState, useEffect } from 'react';
import axios from 'axios';

export function useCurrency(familyId) {
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (familyId) {
      fetchCurrency();
    }
  }, [familyId]);

  const fetchCurrency = async () => {
    try {
      const response = await axios.get(`/api/family/${familyId}`);
      if (response.data.family) {
        setCurrency(response.data.family.currency || 'USD');
      }
    } catch (error) {
      console.error('Error fetching currency:', error);
    }
  };

  return currency;
}

