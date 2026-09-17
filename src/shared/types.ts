export type ContactStatus = 'pending_outgoing' | 'pending_incoming' | 'accepted' | 'blocked';
export type ChatType = 'direct' | 'group';
export type ChatRole = 'owner' | 'member';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export type UpdateStatus =
  'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready';

export interface User {
  peerId: string;
  nickname: string;
  avatar: string | null;
  publicKey: string | null;
  isSelf: boolean;
  contactStatus: ContactStatus | null;
  address: string | null;
  addedAt: number | null;
  lastSeenAt: number | null;
  lastSyncAt: number | null;
  lastSyncMessageId: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  notificationSound: string | null;
  notificationVolume: number | null;
  notificationMono: boolean | null;
}

export interface Chat {
  id: string;
  type: ChatType;
  title: string | null;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface ChatMember {
  chatId: string;
  peerId: string;
  role: ChatRole | null;
  joinedAt: number | null;
  leftAt: number | null;
  lastReadAt: number | null;
}

export interface ReplyPreview {
  id: string;
  senderId: string;
  senderNickname: string;
  senderAvatar: string | null;
  text: string;
  replyDeleted: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderNickname: string;
  senderAvatar: string | null;
  text: string;
  replyTo: ReplyPreview | null;
  createdAt: number;
  editedAt: number | null;
  deletedAt: number | null;
  status: MessageStatus | null;
  attachments: Attachment[];
}

export interface ChatListItem {
  id: string;
  type: ChatType;
  title: string;
  avatar: string | null;
  otherPeerId: string | null;
  isOnline: boolean;
  lastMessage: Message | null;
  updatedAt: number;
  unreadCount: number;
}

export type AttachmentTransferState = 'pending' | 'complete' | 'failed';

export interface Attachment {
  id: string;
  messageId: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  filePath: string | null;
  transferState: AttachmentTransferState | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  orderIndex: number;
  createdAt: number | null;
  deletedAt: number | null;
  fileDeletedAt: number | null;
}

export interface Reaction {
  messageId: string;
  peerId: string;
  emoji: string;
  createdAt: number | null;
}

export interface SoundData {
  name: string | null;
  dataUrl: string | null;
  volume: number;
  mono: boolean;
}
