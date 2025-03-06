import { useState, useEffect } from 'react';
import { validateAndSetToken, removeToken, hasValidToken } from '@/app/actions/token';

export function useGitLabToken() {
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if token exists on mount
  useEffect(() => {
    const checkToken = async () => {
      try {
        const { hasToken: exists } = await hasValidToken();
        setHasToken(exists);
      } catch (error) {
        console.error('Failed to check token status:', error);
        setHasToken(false);
      } finally {
        setIsInitialized(true);
      }
    };

    checkToken();
  }, []);

  const updateToken = async (newToken: string | null) => {
    try {
      if (newToken) {
        await validateAndSetToken(newToken);
        setHasToken(true);
      } else {
        await removeToken();
        setHasToken(false);
      }
    } catch (error) {
      throw error;
    }
  };

  return {
    hasToken,
    isInitialized,
    updateToken,
  };
} 