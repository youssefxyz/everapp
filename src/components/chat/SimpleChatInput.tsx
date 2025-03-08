import React, { useState } from 'react';
import { MessageContent } from '@/utils/supabase/messageTypes';
import { Smile, Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: MessageContent) => Promise<void>;
  isLoading?: boolean;
  conversationId: string;
}

const SimpleChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading = false
}) => {
  const [text, setText] = useState('');

  const handleSendTextMessage = async () => {
    if (!text.trim()) return;
    
    await onSendMessage({
      type: 'text',
      content: text
    });
    
    setText('');
  };

  const handleEmojiSelect = async (emoji: string) => {
    await onSendMessage({
      type: 'emoji',
      content: emoji
    });
  };

  return (
    <div className="flex items-center space-x-2 p-2 border-t">
      <button 
        className="p-2 rounded-full hover:bg-gray-100"
        onClick={() => handleEmojiSelect('😊')}
      >
        <Smile className="h-5 w-5" />
      </button>
      
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 border rounded-md px-3 py-2"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendTextMessage();
          }
        }}
      />
      
      <button 
        className="p-2 bg-blue-500 text-white rounded-full"
        onClick={handleSendTextMessage} 
        disabled={!text.trim() || isLoading}
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
};

export default SimpleChatInput;