import React from 'react';
import './EmptyState.css';
import MessageIcon from '@renderer/assets/message.svg?react';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Выберите чат',
  subtitle = 'Начните переписку слева или создайте новую'
}): React.JSX.Element => {
  return (
    <div className="empty-state">
      <MessageIcon height={100} width={100} className="empty-state__icon" />
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__subtitle">{subtitle}</p>
    </div>
  );
};
