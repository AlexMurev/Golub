import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { User } from '@shared/types';

export interface UseContactsResult {
  accepted: User[];
  incoming: User[];
  outgoing: User[];
  incomingCount: number;
  isLoading: boolean;
  reload: () => Promise<void>;
}

interface ContactsSnapshot {
  users: User[];
  isLoading: boolean;
}

let snapshot: ContactsSnapshot = { users: [], isLoading: true };
const listeners = new Set<() => void>();
let started = false;

function emit(): void {
  listeners.forEach((listener): void => listener());
}

function setSnapshot(next: ContactsSnapshot): void {
  snapshot = next;
  emit();
}

async function loadContacts(): Promise<void> {
  try {
    const data = await window.api.db.users.list();
    setSnapshot({ users: data as User[], isLoading: false });
  } catch (err) {
    console.error('Failed to load contacts:', err);
    setSnapshot({ users: snapshot.users, isLoading: false });
  }
}

function subscribe(listener: () => void): () => void {
  if (!started) {
    started = true;
    void loadContacts();

    window.api.transport.onDataChanged((): void => {
      void loadContacts();
    });
    window.api.transport.onNewPeer((): void => {
      void loadContacts();
    });
    window.api.transport.onPeerOnline((): void => {
      void loadContacts();
    });
    window.api.transport.onPeerOffline((): void => {
      void loadContacts();
    });
  }
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ContactsSnapshot {
  return snapshot;
}

export function useContacts(): UseContactsResult {
  const snap = useSyncExternalStore(subscribe, getSnapshot);

  const reload = useCallback(async (): Promise<void> => {
    await loadContacts();
  }, []);

  const { accepted, incoming, outgoing } = useMemo(() => {
    return {
      accepted: snap.users.filter((u) => u.contactStatus === 'accepted'),
      incoming: snap.users.filter((u) => u.contactStatus === 'pending_incoming'),
      outgoing: snap.users.filter((u) => u.contactStatus === 'pending_outgoing')
    };
  }, [snap.users]);

  return {
    accepted,
    incoming,
    outgoing,
    incomingCount: incoming.length,
    isLoading: snap.isLoading,
    reload
  };
}
