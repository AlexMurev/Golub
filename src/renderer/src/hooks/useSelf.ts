import { useCallback, useEffect, useState } from 'react';
import type { User } from '@shared/types';

export interface UseSelfResult {
  self: User | null;
  isLoading: boolean;
  updateSelf: (patch: { nickname?: string; avatar?: string | null }) => Promise<void>;
  reload: () => Promise<void>;
}

export function useSelf(): UseSelfResult {
  const [self, setSelf] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const reload = useCallback(async (): Promise<void> => {
    const data = await window.api.db.users.getSelf();
    setSelf(data);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async (): Promise<void> => {
      try {
        const data = await window.api.db.users.getSelf();
        if (!cancelled) setSelf(data);
      } catch (err) {
        console.error('Failed to load self:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return (): void => {
      cancelled = true;
    };
  }, []);

  const updateSelf = useCallback(
    async (patch: { nickname?: string; avatar?: string | null }): Promise<void> => {
      const data = await window.api.db.users.updateSelf(patch);
      setSelf(data);
    },
    []
  );

  return { self, isLoading, updateSelf, reload };
}
