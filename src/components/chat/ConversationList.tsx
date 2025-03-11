import { useRouter } from 'next/navigation';
import { Conversation } from '@/types/chat';

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  onConversationSelect: (conversationId: string) => Promise<void>;
}

export const ConversationList = ({ conversations, isLoading, onConversationSelect }: ConversationListProps) => {
  const router = useRouter();

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Loading conversations...</div>;
  }

  if (conversations.length === 0) {
    return <div className="p-4 text-center text-gray-500">No conversations yet</div>;
  }

  return (
    <div className="overflow-y-auto flex-1">
      {conversations.map((conv) => (
        <button
          key={conv.conversation_id}
          onClick={() => router.push(`/chat/${conv.conversation_id}`)}
          className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 border-b relative"
        >
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">
            {conv.profiles.username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <h3 className="font-medium truncate">{conv.profiles.username}</h3>
              <span className="text-xs text-gray-500">
                {new Date(conv.conversations.last_message_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <p className="text-sm text-gray-500 truncate">
              {conv.conversations.last_message || 'No messages yet'}
            </p>
          </div>
          {conv.unread_count > 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <span className="bg-green-500 text-white text-xs rounded-full px-2 py-1">
                {conv.unread_count}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
};