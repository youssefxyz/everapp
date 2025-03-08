import { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';

interface ChatMessagesProps {
  messages: Message[];
  currentUserId: string;
}

export const ChatMessages = ({ messages, currentUserId }: ChatMessagesProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.user_id === currentUserId ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`max-w-[70%] ${message.user_id === currentUserId ? 'bg-blue-500 text-white' : 'bg-gray-100'} rounded-lg p-3`}>
            <div className="text-sm font-medium mb-1">
              {message.user_id === currentUserId ? 'You' : message.sender_name}
            </div>
            <p className="break-words">{message.content}</p>
            <div className="text-xs opacity-75 mt-1">
              {new Date(message.created_at).toLocaleTimeString()}
              {message.is_edited && ' (edited)'}
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};