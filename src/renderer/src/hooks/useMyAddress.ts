import { useEffect, useState } from 'react';

export const useMyAddress = (): string | null => {
  const [myAddress, setMyAddress] = useState<string | null>(null);

  useEffect((): (() => void) => {
    let cancelled = false;

    (async (): Promise<void> => {
      try {
        const info = await window.api.transport.getMyInfo();
        if (!cancelled && info) setMyAddress(info.address);
      } catch (err) {
        console.error('Failed to load transport info:', err);
      }
    })();

    return (): void => {
      cancelled = true;
    };
  }, []);

  return myAddress;
};
