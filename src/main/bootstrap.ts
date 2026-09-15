import { getSelf, upsertSelf } from './db/repositories/usersRepo';
import { getSetting, setSetting } from './db/repositories/settingsRepo';

export function ensureSelfUser(): void {
  const existing = getSelf();
  if (existing) {
    console.log(`Self user ready: ${existing.peerId} (${existing.nickname})`);
    return;
  }

  let peerId = getSetting('peer_id');
  if (!peerId) {
    peerId = 'user-' + crypto.randomUUID();
    setSetting('peer_id', peerId);
  }

  upsertSelf(peerId, 'Аноним', null);
  console.log(`Self user created: ${peerId}`);
}
