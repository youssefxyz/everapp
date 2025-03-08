import { OnlineUser } from '@/types/chat';

interface OnlineUsersProps {
  onlineUsers: OnlineUser[];
  onUserSelect: (userId: string, username: string) => void;
}

export const OnlineUsers = ({ onlineUsers, onUserSelect }: OnlineUsersProps) => {
  return (
    <div className="p-4 border-b bg-gray-50">
      <h3 className="text-sm font-medium text-gray-500 mb-2">Online Users</h3>
      <div className="flex flex-wrap gap-2">
        {onlineUsers.map((user) => (
          <button
            key={user.id}
            onClick={() => onUserSelect(user.id, user.username)}
            className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800 text-sm hover:bg-green-200 transition-colors"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            {user.username}
          </button>
        ))}
        {onlineUsers.length === 0 && (
          <p className="text-sm text-gray-500">No users online</p>
        )}
      </div>
    </div>
  );
};