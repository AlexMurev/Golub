import { useCallback, useEffect, useState } from 'react';
import type { User } from '@shared/types';

export interface UseContactsResult {
  accepted: User[];
  incoming: User[];
  outgoing: User[];
  incomingCount: number;
  isLoading: boolean;
  reload: () => Promise<void>;
}

export function useContacts(): UseContactsResult {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.db.users.list();
      // list() возвращает User[] с isOnline; отфильтруем себя на всякий случай
      setUsers(data as User[]);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async (): Promise<void> => {
      try {
        const data = await window.api.db.users.list();
        if (!cancelled) setUsers(data as User[]);
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    const unsubData = window.api.transport.onDataChanged((): void => {
      void reload();
    });
    const unsubNew = window.api.transport.onNewPeer((): void => {
      void reload();
    });
    const unsubOnline = window.api.transport.onPeerOnline((): void => {
      void reload();
    });
    const unsubOffline = window.api.transport.onPeerOffline((): void => {
      void reload();
    });

    return (): void => {
      cancelled = true;
      unsubData();
      unsubNew();
      unsubOnline();
      unsubOffline();
    };
  }, [reload]);

  const accepted = users.filter((u) => u.contactStatus === 'accepted');
  const incoming = users.filter((u) => u.contactStatus === 'pending_incoming');
  const outgoing = users.filter((u) => u.contactStatus === 'pending_outgoing');

  return {
    accepted,
    incoming,
    outgoing,
    incomingCount: incoming.length,
    isLoading,
    reload
  };
}
