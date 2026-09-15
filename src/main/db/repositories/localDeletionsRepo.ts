import { getDb } from '../index';

export type DeletionEntityType = 'message' | 'chat' | 'attachment';

export function markDeleted(entityType: DeletionEntityType, entityId: string): void {
  getDb()
    .prepare(
      `INSERT INTO local_deletions (entity_type, entity_id, deleted_at)
       VALUES (?, ?, ?)
       ON CONFLICT(entity_type, entity_id) DO NOTHING`
    )
    .run(entityType, entityId, Date.now());
}

export function isDeleted(entityType: DeletionEntityType, entityId: string): boolean {
  const row = getDb()
    .prepare('SELECT 1 FROM local_deletions WHERE entity_type = ? AND entity_id = ?')
    .get(entityType, entityId);
  return !!row;
}

export function listDeleted(entityType: DeletionEntityType): string[] {
  const rows = getDb()
    .prepare('SELECT entity_id FROM local_deletions WHERE entity_type = ?')
    .all(entityType) as { entity_id: string }[];
  return rows.map((r) => r.entity_id);
}

export function unmarkDeleted(entityType: DeletionEntityType, entityId: string): void {
  getDb()
    .prepare('DELETE FROM local_deletions WHERE entity_type = ? AND entity_id = ?')
    .run(entityType, entityId);
}
