import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MessageText.css';
import remarkBreaks from 'remark-breaks';

interface MessageTextProps {
  text: string;
}

export const MessageText: React.FC<MessageTextProps> = ({ text }) => {
  return (
    <div className="message__text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="message__link">
              {children}
            </a>
          )
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
