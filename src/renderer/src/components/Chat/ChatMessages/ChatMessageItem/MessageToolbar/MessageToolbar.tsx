import React from 'react';
import ReplyIcon from '@renderer/assets/reply.svg?react';
import './MessageToolbar.css';

interface QuickReaction {
  name: string;
  dataUrl: string;
}

interface MessageToolbarProps {
  messageId: string;
  quickReactions: QuickReaction[];
  isQuickMine: (name: string) => boolean;
  onToggleReaction: (name: string, dataUrl: string, isMine: boolean) => void;
  onOpenPicker: (messageId: string, x: number, y: number) => void;
  onReply: () => void;
}

const SmileIcon: React.FC = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

export const MessageToolbar: React.FC<MessageToolbarProps> = ({
  messageId,
  quickReactions,
  isQuickMine,
  onToggleReaction,
  onOpenPicker,
  onReply
}): React.JSX.Element => {
  return (
    <div className="message-toolbar">
      {quickReactions.map((r) => {
        const mine = isQuickMine(r.name);
        return (
          <button
            key={r.name}
            type="button"
            className={`message-toolbar__btn ${mine ? 'message-toolbar__btn--active' : ''}`}
            onClick={(): void => onToggleReaction(r.name, r.dataUrl, mine)}
            title={`Реакция «${r.name}»`}
          >
            <img src={r.dataUrl} alt={r.name} className="message-toolbar__img" />
          </button>
        );
      })}
      <button
        type="button"
        className="message-toolbar__btn"
        onClick={(e): void => {
          const rect = e.currentTarget.getBoundingClientRect();
          onOpenPicker(messageId, rect.left, rect.bottom);
        }}
        title="Все реакции"
      >
        <SmileIcon />
      </button>
      <button type="button" className="message-toolbar__btn" onClick={onReply} title="Ответить">
        <ReplyIcon width={22} height={22} />
      </button>
    </div>
  );
};
