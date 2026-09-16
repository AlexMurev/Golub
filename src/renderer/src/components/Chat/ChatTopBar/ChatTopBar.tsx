import React from 'react';
import './ChatTopBar.css';

interface ChatTopBarProps {
  title: string;
  subtitle?: string;
  avatar?: string | null;
  isOnline?: boolean;
  onClick?: () => void;
}

export const ChatTopBar: React.FC<ChatTopBarProps> = ({
  title,
  subtitle,
  avatar,
  isOnline,
  onClick
}): React.JSX.Element => {
  const avatarPlaceholder: string = title.charAt(0).toUpperCase() || '?';

  return (
    <header className="chat-topbar">
      <button
        type="button"
        className={`chat-topbar__profile ${onClick ? 'chat-topbar__profile--clickable' : ''}`}
        onClick={onClick}
        disabled={!onClick}
        title={onClick ? 'Открыть карточку' : undefined}
      >
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
      </button>
    </header>
  );
};
