import React from 'react';
import './ChatTopBar.css';

interface ChatTopBarProps {
  title: string;
  subtitle?: string;
  avatar?: string | null;
  isOnline?: boolean;
}

export const ChatTopBar: React.FC<ChatTopBarProps> = ({
  title,
  subtitle,
  avatar,
  isOnline
}): React.JSX.Element => {
  const avatarPlaceholder: string = title.charAt(0).toUpperCase() || '?';

  return (
    <header className="chat-topbar">
      <div className="chat-topbar__avatar-wrapper">
        {avatar ? (
          <img src={avatar} alt={title} className="chat-topbar__avatar" />
        ) : (
          <div className="chat-topbar__avatar chat-topbar__avatar--placeholder">
            {avatarPlaceholder}
          </div>
        )}
        {isOnline !== undefined && (
          <span
            className={`chat-topbar__status-dot ${isOnline ? 'chat-topbar__status-dot--online' : ''}`}
          />
        )}
      </div>
      <div className="chat-topbar__info">
        <span className="chat-topbar__title">{title}</span>
        {subtitle && <span className="chat-topbar__subtitle">{subtitle}</span>}
      </div>
    </header>
  );
};
