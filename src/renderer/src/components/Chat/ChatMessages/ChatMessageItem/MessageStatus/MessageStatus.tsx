import React from 'react';
import type { MessageStatus as Status } from '@shared/types';
import './MessageStatus.css';

interface MessageStatusProps {
  status: Status | null;
}

const ClockIcon: React.FC = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </svg>
);

const SingleCheck: React.FC = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DoubleCheck: React.FC = () => (
  <svg
    width="18"
    height="12"
    viewBox="0 0 32 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 6 6 17 1 12" />
    <polyline points="29 6 20 17 15 12" />
  </svg>
);

export const MessageStatus: React.FC<MessageStatusProps> = ({ status }) => {
  if (!status) return null;

  if (status === 'pending') {
    return (
      <span className="message__status" title="Отправляется">
        <ClockIcon />
      </span>
    );
  }

  if (status === 'read') {
    return (
      <span className="message__status" title="Прочитано">
        <DoubleCheck />
      </span>
    );
  }

  // sent и delivered — одна галочка
  return (
    <span className="message__status" title="Доставлено">
      <SingleCheck />
    </span>
  );
};
