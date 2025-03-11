import { useState } from 'react';
import { useMessageReactions } from '@/hooks/useMessageReactions';

interface MessageReactionsProps {
  messageId: string;
  userId: string;
}

const EMOJI_LIST = [
  '👍', '❤️',           // Common reactions
  '🕌', '🕍',           // Mosques
  '🧔', '👳‍♂️',         // Men with beard
  '🧕', '👰',           // Women
  '🤲', '🙏',           // Prayer positions
  '☪️', '📿',           // Religious symbols
  '🌙', '⭐',           // Night/Star
  '🕋', '🌺',           // Kaaba and Paradise flower
  '🔥', '💫',           // Symbolic for hell/heaven
  '⚰️', '💐',           // Janazah related
  '💑', '💝',           // Wedding/Love
  '🌴', '🌹'            // Paradise elements
];

export function MessageReactions({ messageId, userId }: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { reactions, addReaction, removeReaction } = useMessageReactions(messageId);

  const handleReaction = (emoji: string) => {
    const hasReacted = reactions.some(
      (r) => r.user_id === userId && r.emoji === emoji
    );

    if (hasReacted) {
      removeReaction(userId, emoji);
    } else {
      addReaction(userId, emoji);
    }
    setShowEmojiPicker(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-1 items-center">
        {Object.entries(
          reactions.reduce((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).map(([emoji, count]) => (
          <button
            key={emoji}
            onClick={() => handleReaction(emoji)}
            className={`text-sm px-2 py-1 rounded-full ${
              reactions.some((r) => r.user_id === userId && r.emoji === emoji)
                ? 'bg-blue-100'
                : 'bg-gray-100'
            } hover:bg-blue-200 transition-colors`}
          >
            {emoji} {count}
          </button>
        ))}
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
        >
          +
        </button>
      </div>
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 bg-white shadow-lg rounded-lg p-2 flex gap-1">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="hover:bg-gray-100 p-1 rounded"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}