import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Role } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fadeIn`}>
      <div
        className={`relative max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed break-words ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-none'
            : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
        } ${message.isError ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
      >
        {!isUser && message.senderName && (
          <div className="text-xs font-bold text-primary-600 mb-1">
            {message.senderName}
          </div>
        )}
        {message.isError ? (
          <p>⚠️ 메시지 전송 실패: {message.text}</p>
        ) : (
          <div className={`markdown-content ${isUser ? 'text-white' : 'text-gray-800'}`}>
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                code: ({ children }) => <code className={`bg-opacity-20 rounded px-1 ${isUser ? 'bg-black' : 'bg-gray-200'}`}>{children}</code>,
                pre: ({ children }) => <pre className="bg-gray-800 text-gray-100 p-2 rounded-lg my-2 overflow-x-auto text-xs">{children}</pre>,
                ul: ({ children }) => <ul className="list-disc list-inside ml-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside ml-2">{children}</ol>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2">{children}</a>
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        )}
        <div className={`text-[10px] mt-1 text-right ${isUser ? 'text-blue-100' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};