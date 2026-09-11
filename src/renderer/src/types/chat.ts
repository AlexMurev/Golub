export interface Message {
  id: string;
  senderId: string;
  senderNickname: string;
  senderAvatar?: string;
  text: string;
  createdAt: number;
  replyTo?: {
    id: string;
    senderId: string;
    senderNickname: string;
    senderAvatar?: string;
    text: string;
  };
}
