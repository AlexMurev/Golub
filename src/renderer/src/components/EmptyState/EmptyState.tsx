import React from 'react';
import './EmptyState.css';

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
      <div className="empty-state__icon">💬</div>
      <h2 className="empty-state__title">{title}</h2>
      <p className="empty-state__subtitle">{subtitle}</p>
    </div>
  );
};
