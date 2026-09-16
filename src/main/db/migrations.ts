export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    id: 1,
    name: 'initial_schema',
    sql: `
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updatedAt INTEGER
      );

      CREATE TABLE users (
        peerId TEXT PRIMARY KEY,
        nickname TEXT,
        avatar TEXT,
        publicKey TEXT,
        isSelf INTEGER NOT NULL DEFAULT 0,
        contactStatus TEXT,
        address TEXT,
        addedAt INTEGER,
        lastSeenAt INTEGER,
        lastSyncAt INTEGER,
        lastSyncMessageId TEXT,
        createdAt INTEGER,
        updatedAt INTEGER
      );

      CREATE INDEX idx_users_isSelf ON users(isSelf);
      CREATE INDEX idx_users_contactStatus ON users(contactStatus);

      CREATE TABLE chats (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
        title TEXT,
        createdBy TEXT,
        createdAt INTEGER,
        updatedAt INTEGER,
        deletedAt INTEGER
      );

      CREATE TABLE chatMembers (
        chatId TEXT NOT NULL,
        peerId TEXT NOT NULL,
        role TEXT CHECK (role IN ('owner', 'member')),
        joinedAt INTEGER,
        leftAt INTEGER,
        PRIMARY KEY (chatId, peerId),
        FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE,
        FOREIGN KEY (peerId) REFERENCES users(peerId) ON DELETE CASCADE
      );

      CREATE INDEX idx_chatMembers_peerId ON chatMembers(peerId);

      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        chatId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        text TEXT,
        replyToId TEXT,
        createdAt INTEGER NOT NULL,
        editedAt INTEGER,
        deletedAt INTEGER,
        status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'read')),
        FOREIGN KEY (chatId) REFERENCES chats(id) ON DELETE CASCADE,
        FOREIGN KEY (senderId) REFERENCES users(peerId)
      );

      CREATE INDEX idx_messages_chat_created ON messages(chatId, createdAt);
      CREATE INDEX idx_messages_status ON messages(status);

      CREATE TABLE attachments (
        id TEXT PRIMARY KEY,
        messageId TEXT NOT NULL,
        fileName TEXT,
        mimeType TEXT,
        size INTEGER,
        filePath TEXT,
        createdAt INTEGER,
        deletedAt INTEGER,
        FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
      );

      CREATE TABLE reactions (
        messageId TEXT NOT NULL,
        peerId TEXT NOT NULL,
        emoji TEXT NOT NULL,
        createdAt INTEGER,
        PRIMARY KEY (messageId, peerId),
        FOREIGN KEY (messageId) REFERENCES messages(id) ON DELETE CASCADE
      );

      CREATE TABLE localDeletions (
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        deletedAt INTEGER,
        PRIMARY KEY (entityType, entityId)
      );
    `
  },
  {
    id: 2,
    name: 'notifications_and_unread',
    sql: `
    ALTER TABLE users ADD COLUMN notificationSound TEXT;
    ALTER TABLE chatMembers ADD COLUMN lastReadAt INTEGER;
  `
  }
];
