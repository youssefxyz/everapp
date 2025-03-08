import { useState, useRef } from 'react';
import { Smile, Paperclip, Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void>;
  onTyping: () => void;
}

export const MessageInput = ({ onSendMessage, onTyping }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      await onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    onTyping();
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-3 flex items-center space-x-2">
      <button 
        type="button" 
        className="text-gray-500 hover:text-gray-700"
        onClick={() => {
          // Emoji picker functionality would go here
          // For now, just add a simple emoji
          setMessage(prev => prev + '😊');
          inputRef.current?.focus();
        }}
      >
        <Smile className="h-5 w-5" />
      </button>
      
      <button 
        type="button" 
        className="text-gray-500 hover:text-gray-700"
      >
        <Paperclip className="h-5 w-5" />
      </button>
      
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <button 
        type="submit" 
        className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={!message.trim()}
      >
        <Send className="h-5 w-5" />
      </button>
    </form>
  );
};