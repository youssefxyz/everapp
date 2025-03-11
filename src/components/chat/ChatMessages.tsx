import { useEffect, useRef } from 'react';
import type { Message } from '@/types/chat';
import { Message as MessageComponent } from './Message';  // Import the component

interface ChatMessagesProps {
  messages: Message[];
  currentUserId: string;
  conversationId: string;
}

export const ChatMessages = ({ messages, currentUserId, conversationId }: ChatMessagesProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message) => (
        <MessageComponent
          key={message.id}
          id={message.id}
          content={message.content}
          userId={currentUserId}
          timestamp={message.created_at}
          isSender={message.user_id === currentUserId}
          conversationId={conversationId}
        />
      ))}
    </div>
  );
};