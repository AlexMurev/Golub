import React from 'react';
import './TypingIndicator.css';

interface TypingIndicatorProps {
  visible: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ visible }) => {
  return (
    <div className={`typing-indicator ${visible ? 'typing-indicator--visible' : ''}`}>
      <div className="typing-indicator__bubble">
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
        <span className="typing-indicator__dot" />
      </div>
      <span className="typing-indicator__label">печатает…</span>
    </div>
  );
};
