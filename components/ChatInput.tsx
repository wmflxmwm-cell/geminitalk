import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, disabled }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !isLoading && !disabled) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-white border-t border-gray-100">
      <div className="flex items-end gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "대화를 시작하려면 친구를 선택하세요" : "메시지를 입력하세요..."}
          disabled={disabled || isLoading}
          rows={1}
          className="w-full bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 resize-none max-h-32 py-3 px-2 text-base"
          style={{ minHeight: '44px' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || disabled}
          className={`p-3 rounded-xl flex-shrink-0 transition-colors duration-200 mb-0.5 ${
            input.trim() && !isLoading && !disabled
              ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizontal className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};