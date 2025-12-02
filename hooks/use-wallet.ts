import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export function useWallet() {
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await api.get('/wallet/balance');
      // Assuming the API returns { data: { available: number } } or similar
      // Adjust based on your actual API response structure
      if (response.data?.data?.available !== undefined) {
        setBalance(response.data.data.available);
      } else if (response.data?.available !== undefined) {
        setBalance(response.data.available);
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    refreshWallet: fetchBalance,
  };
}
