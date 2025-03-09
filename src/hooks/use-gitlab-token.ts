import { useState, useEffect } from 'react';
import { removeToken, hasValidToken } from '@/src/app/actions/token';

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
    if (newToken === null) {
      await removeToken();
      setHasToken(false);
    } else {
      // Token validation is already done in the settings page
      setHasToken(true);
    }
  };

  return {
    hasToken,
    isInitialized,
    updateToken,
  };
}
