import { useMessageStatus } from '@/hooks/useMessageStatus';

interface MessageProps {
  id: string;
  content: string;
  userId: string;
  conversationId: string;
  timestamp: string;
  isSender: boolean;
}

export const Message = ({ id, content, userId, conversationId, timestamp, isSender }: MessageProps) => {
  const { messageStatuses } = useMessageStatus(conversationId, userId);
  const isRead = messageStatuses.find(status => status.messageId === id)?.isRead;

  return (
    <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] rounded-lg p-3 ${
        isSender ? 'bg-blue-500 text-white' : 'bg-gray-100'
      }`}>
        <p>{content}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-xs opacity-70">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
          {isSender && (
            <span className="text-xs">
              {isRead ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};