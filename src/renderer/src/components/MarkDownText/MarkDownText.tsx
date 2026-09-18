import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './MarkDownText.css';

interface MessageTextProps {
  text: string;
}

const markdownComponents: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="message__link">
      {children}
    </a>
  ),
  // Убрали несуществующий проп inline
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeText = String(children).replace(/\n$/, '');

    // Безопасное приведение типов пропсов для хайлайтера
    const highlighterProps = props as React.ComponentProps<typeof SyntaxHighlighter>;

    // Если есть совпадение по языку (например, language-javascript), значит это БЛОК кода
    return match ? (
      <SyntaxHighlighter
        {...highlighterProps}
        style={oneDark}
        language={match[1]} // match[1] содержит чистое имя языка ('javascript', 'css' и т.д.)
        PreTag="div"
      >
        {codeText}
      </SyntaxHighlighter>
    ) : (
      // Если регулярное выражение ничего не нашло, значит это инлайновый код
      <code className={className} {...props}>
        {children}
      </code>
    );
  }
};

export const MarkDownText: React.FC<MessageTextProps> = ({ text }) => {
  return (
    <div className="message__text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
